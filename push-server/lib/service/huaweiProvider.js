module.exports = HuaweiProvider;

var logger = require('../log/index.js')('HuaweiProvider');

var util = require('../util/util.js');
var request = require('request');
var tokenUrl = "https://login.vmall.com/oauth2/token";
var apiUrl = "https://api.vmall.com/rest.php";
var timeout = 5000;

function HuaweiProvider(config) {
    if (!(this instanceof HuaweiProvider)) return new HuaweiProvider(config);
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

HuaweiProvider.prototype.sendOne = function (notification, tokenData, timeToLive, callback) {
    if (notification.android.title) {
        var self = this;
        tokenData.package_name = tokenData.package_name || this.default_package_name;
        if (!this.authInfo[tokenData.package_name]) {
            logger.debug('huawei package name not supported', self.default_package_name);
            return;
        }
        this.checkToken(tokenData.package_name, function () {
            logger.debug("sendOne ", notification, timeToLive);
            var postData = self.getPostData(1, notification, tokenData, timeToLive);
            request.post({
                url: apiUrl,
                form: postData,
                timeout: timeout
            }, function (error, response, body) {
                logger.debug("sendOne result", error, body);
                if (!error && response.statusCode == 200 && callback) {
                    callback();
                }
            })
        });
    }
};

HuaweiProvider.prototype.getPostData = function (push_type, notification, tokenData, timeToLive) {
    var postData = {
        access_token: this.authInfo[tokenData.package_name].access_token,
        nsp_svc: "openpush.openapi.notification_send",
        nsp_fmt: "JSON",
        nsp_ts: Date.now(),
        push_type: push_type,
        android: JSON.stringify({
            notification_title: notification.android.title,
            notification_content: notification.android.message,
            extras: [notification.id, notification.android],
            doings: 2
        })
    };
    if (tokenData && tokenData.token) {
        postData.tokens = tokenData.token;
    }
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
        for (var package_name in this.authInfo) {
            this.checkToken(package_name, function (tokenError) {
                if (!tokenError) {
                    logger.debug("sendAll ", notification, timeToLive);
                    var postData = self.getPostData(2, notification, {package_name: package_name}, timeToLive);
                    request.post({
                        url: apiUrl,
                        form: postData
                    }, function (error, response, body) {
                        logger.info("sendAll result", error, response.statusCode, body);
                        if (!error && callback) {
                            callback();
                        } else if (callback) {
                            callback(error);
                        }
                    })
                } else if (callback) {
                    callback(tokenError);
                }
            });
        }
    }
};

HuaweiProvider.prototype.checkToken = function (package_name, callback) {
    var self = this;
    var authInfo = self.authInfo[package_name];
    if (authInfo.access_token && Date.now() < authInfo.access_token_expire) {
        logger.debug("token valid");
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