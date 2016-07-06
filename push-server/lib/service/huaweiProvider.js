module.exports = HuaweiProvider;

var logger = require('../log/index.js')('HuaweiProvider');

var util = require('../util/util.js');
var request = require('request');
var tokenUrl = "https://login.vmall.com/oauth2/token";
var apiUrl = "https://api.vmall.com/rest.php";
var timeout = 5000;

function HuaweiProvider(config, stats) {
    if (!(this instanceof HuaweiProvider)) return new HuaweiProvider(config, stats);
    this.stats = stats;
    this.access_token = "";
    this.authInfo = {};
    var self = this;
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

        var self = this;
        self.stats.addPushTotal(tokenDataList.length, self.type);

        var mapTokenData = {};
        for (token in tokenDataList) {
            var package_name = tokenDataList[token].package_name || this.default_package_name;
            if (!this.authInfo[package_name]) {
                logger.error('huawei package name not supported: ', package_name);
                continue;
            }
            tokenList = mapTokenData[package_name] || [];
            tokenList.push(tokenDataList[token]);
            mapTokenData[package_name] = tokenList;
        }

        for (packet_name in mapTokenData) {
            this.checkToken(package_name, function (tokenError) {
                if (!tokenError) {
                    logger.debug("sendMany ", notification, timeToLive);
                    var postData = self.getPostData(1, notification, package_name, mapTokenData[package_name], timeToLive);
                    request.post({
                        url: apiUrl,
                        form: postData,
                        timeout: timeout
                    }, function (error, response, body) {
                        logger.debug("sendOne result", error, body);
                        if (!error && response && response.statusCode == 200) {
                            self.stats.addPushSuccess(mapTokenData[package_name].length, self.type);
                        }else {
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
    var postData = {
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
    // if (tokenData && tokenData.token) {
    //     postData.tokens = tokenData.token;
    // }
    var tokens = '';
    for (token in tokenDataList) {
        if (tokenDataList[token].token) {
            tokens += tokenDataList[token].token + ',';
        }
    }
    if (tokens)
        postData.tokens = tokens.slice(0, -1);

    if (timeToLive > 0) {
        postData.expire_time = formatHuaweiDate(new Date(Date.now() + timeToLive));
        logger.debug("postData.expire_time ", postData.expire_time);
    }
    return postData;
}

HuaweiProvider.prototype.addToken = function (data) {

};

HuaweiProvider.prototype.sendAll = function (notification, timeToLive, callback) {
    if (notification.android.title) {
        var self = this;

        var httpResponseCount = 0;
        for (var package_name in this.authInfo) {
            self.stats.addPushTotal(1, self.type + "All");
            this.checkToken(package_name, function (tokenError) {
                if (!tokenError) {
                    logger.debug("sendAll ", notification, timeToLive);
                    var postData = self.getPostData(2, notification, package_name, {package_name: package_name}, timeToLive);
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
    var self = this;
    var authInfo = self.authInfo[package_name];
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
                var data = JSON.parse(body);
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
    var tzo = -date.getTimezoneOffset(),
        dif = tzo >= 0 ? '+' : '-',
        pad = function (num) {
            var norm = Math.abs(Math.floor(num));
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