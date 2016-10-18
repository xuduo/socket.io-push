module.exports = (config, stats) => {
    return new HuaweiProvider(config, stats);
};

const logger = require('winston-proxy')('HuaweiProvider');
const request = require('request');
const tokenUrl = "https://login.vmall.com/oauth2/token";
const apiUrl = "https://api.vmall.com/rest.php";
const timeout = 5000;

class HuaweiProvider {

    constructor(config, stats) {
        this.stats = stats;
        this.access_token = "";
        this.authInfo = {};
        this.default_package_name = undefined;
        config.forEach((val) => {
            this.authInfo[val.package_name] = val;
            val.access_token_expire = 0;
            if (!this.default_package_name) {
                this.default_package_name = val.package_name;
                logger.info('huawei default package name ', this.default_package_name);
            }
        });
        this.type = "huawei";
    }

    sendMany(notification, tokenDataList, timeToLive, callback) {
        if (notification.android.title) {
            this.stats.addPushTotal(tokenDataList.length, this.type);
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
                this.checkToken(package_name, (tokenError) => {
                    if (!tokenError) {
                        logger.debug("sendMany ", notification, timeToLive);
                        const postData = this.getPostData(1, notification, package_name, mapTokenData[package_name], timeToLive);
                        request.post({
                            url: apiUrl,
                            form: postData,
                            timeout: timeout
                        }, (error, response, body) => {
                            logger.debug("sendOne result", error, body);
                            if (!error && response && response.statusCode == 200) {
                                this.stats.addPushSuccess(mapTokenData[package_name].length, this.type);
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
    }

    getPostData(push_type, notification, package_name, tokenDataList, timeToLive) {
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
            postData.tokens = tokenDataList.map((tokenData) => {
                return tokenData.token;
            }).join();
        }

        if (timeToLive > 0) {
            postData.expire_time = this.formatHuaweiDate(new Date(Date.now() + timeToLive));
            logger.debug("postData.expire_time ", postData.expire_time);
        }
        return postData;
    }

    sendAll(notification, timeToLive, callback) {
        if (notification.android.title) {
            for (const package_name in this.authInfo) {
                this.stats.addPushTotal(1, this.type + "All");
                this.checkToken(package_name, (tokenError) => {
                    if (!tokenError) {
                        logger.debug("sendAll ", notification, timeToLive);
                        const postData = this.getPostData(2, notification, package_name, 0, timeToLive);
                        request.post({
                            url: apiUrl,
                            form: postData
                        }, (error, response, body) => {
                            logger.info("sendAll result", error, response && response.statusCode, body);
                            if (!error && response && response.statusCode == 200) {
                                this.stats.addPushSuccess(1, this.type + "All");
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
    }

    checkToken(package_name, callback) {
        const authInfo = this.authInfo[package_name];
        if (authInfo.access_token && Date.now() < authInfo.access_token_expire) {
            callback();
        } else {
            logger.info("request token ", package_name, this.authInfo[package_name]);
            request.post({
                url: tokenUrl,
                form: {
                    grant_type: "client_credentials",
                    client_id: authInfo.client_id,
                    client_secret: authInfo.client_secret
                },
                timeout: timeout
            }, (error, response, body) => {
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
    }

    formatHuaweiDate(date) {
        const tzo = -date.getTimezoneOffset(),
            dif = tzo >= 0 ? '+' : '-',
            pad = (num) => {
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

}