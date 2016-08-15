module.exports = HuaweiProvider;

const logger = require('winston-proxy')('HuaweiProvider');
const request = require('request');
const tokenUrl = "https://login.vmall.com/oauth2/token";
const apiUrl = "https://api.vmall.com/rest.php";
const timeout = 5000;

function HuaweiProvider(config, stats) {
    if (!(this instanceof HuaweiProvider)) return new HuaweiProvider(config, stats);
    this.stats = stats;
    this.access_token = "";
    this.authInfo = {};
    const self = this;
    this.default_package_name = undefined;
    config.forEach(function (val) {
        self.authInfo[val.package_name] = val;
        val.access_token_expire = 0;
        if (!self.default_package_name) {
            self.default_package_name = val.package_name;
            logger.info('huawei default package name ', self.default_package_name);
        }
    });
    this.type = "huawei";
}

HuaweiProvider.prototype.sendMany = function (notification, tokenDataList, timeToLive, callback) {
    if (notification.android.title) {

        const self = this;
        self.stats.addPushTotal(tokenDataList.length, self.type);

        const mapTokenData = {};
        for (const tokenData of tokenDataList) {
            const package_name = tokenData.package_name || this.default_package_name;
            if (!this.authInfo[package_name]) {
                logger.error('huawei package name not supported: ', package_name);
                continue;
            }
            const tokenList = mapTokenData[package_name] || [];
            tokenList.push(tokenData);
            mapTokenData[package_name] = tokenList;
        }

        for (const package_name in mapTokenData) {
            this.checkToken(package_name, function (tokenError) {
                if (!tokenError) {
                    logger.debug("sendMany ", notification, timeToLive);
                    const postData = self.getPostData(1, notification, package_name, mapTokenData[package_name], timeToLive);
                    request.post({
                        url: apiUrl,
                        form: postData,
                        timeout: timeout
                    }, function (error, response, body) {
                        logger.debug("sendOne result", error, body);
                        if (!error && response && response.statusCode == 200) {
                            self.stats.addPushSuccess(mapTokenData[package_name].length, self.type);
                        } else {
                            error = error || 'unknown error';
                        }
                        if (callback) {
                            callback(error);
                        }
                    });
                }
            });
        }
    }
};

HuaweiProvider.prototype.getPostData = function (push_type, notification, package_name, tokenDataList, timeToLive) {
    const postData = {
        access_token: this.authInfo[package_name].access_token,
        nsp_svc: "openpush.openapi.notification_send",
        nsp_fmt: "JSON",
        nsp_ts: Date.now(),
        push_type: push_type,
        android: JSON.stringify({
            notification_title: notification.android.title,
            notification_content: notification.android.message,
            extras: [notification.id, notification.android],
            doings: 1
        })
    };
    if (tokenDataList) {
        postData.tokens = tokenDataList.map(function (tokenData) {
            return tokenData.token;
        }).join();
    }

    if (timeToLive > 0) {
        postData.expire_time = formatHuaweiDate(new Date(Date.now() + timeToLive));
        logger.debug("postData.expire_time ", postData.expire_time);
    }
    return postData;
};

HuaweiProvider.prototype.sendAll = function (notification, timeToLive, callback) {
    if (notification.android.title) {
        const self = this;

        for (const package_name in this.authInfo) {
            self.stats.addPushTotal(1, self.type + "All");
            this.checkToken(package_name, function (tokenError) {
                if (!tokenError) {
                    logger.debug("sendAll ", notification, timeToLive);
                    const postData = self.getPostData(2, notification, package_name, 0, timeToLive);
                    request.post({
                        url: apiUrl,
                        form: postData
                    }, function (error, response, body) {
                        logger.info("sendAll result", error, response && response.statusCode, body);
                        if (!error && response && response.statusCode == 200) {
                            self.stats.addPushSuccess(1, self.type + "All");
                        } else {
                            error = error || "unknown error"
                        }
                        if (callback) {
                            callback(error);
                        }
                    });
                }
            });
        }


    }
};

HuaweiProvider.prototype.checkToken = function (package_name, callback) {
    const self = this;
    const authInfo = self.authInfo[package_name];
    if (authInfo.access_token && Date.now() < authInfo.access_token_expire) {
        callback();
        return;
    } else {
        logger.info("request token ", package_name, self.authInfo[package_name]);
        request.post({
            url: tokenUrl,
            form: {
                grant_type: "client_credentials",
                client_id: authInfo.client_id,
                client_secret: authInfo.client_secret
            },
            timeout: timeout
        }, function (error, response, body) {
            if (!error) {
                const data = JSON.parse(body);
                authInfo.access_token = data.access_token;
                authInfo.access_token_expire = Date.now() + data.expires_in * 1000 - 60 * 1000;
                logger.info("get access token success", data);
                callback();
            } else {
                logger.error("get access token error", body);
                callback(error);
            }
        });
    }
};

function formatHuaweiDate(date) {
    const tzo = -date.getTimezoneOffset(),
        dif = tzo >= 0 ? '+' : '-',
        pad = function (num) {
            const norm = Math.abs(Math.floor(num));
            return (norm < 10 ? '0' : '') + norm;
        };
    return date.getFullYear()
        + '-' + pad(date.getMonth() + 1)
        + '-' + pad(date.getDate())
        + 'T' + pad(date.getHours())
        + ':' + pad(date.getMinutes())
        + ':' + pad(date.getSeconds())
        + dif + pad(tzo / 60)
        + ':' + pad(tzo % 60);
}