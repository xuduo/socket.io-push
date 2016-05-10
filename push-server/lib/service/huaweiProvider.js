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
    this.client_id = config.client_id;
    this.client_secret = config.client_secret;
    this.access_token_expire = 0;
    this.type = "huawei";
}

HuaweiProvider.prototype.sendOne = function (notification, tokenData, timeToLive, callback) {
    var self = this;
    this.checkToken(function () {
        logger.debug("sendOne ", notification, timeToLive);
        var postData = self.getPostData(1, notification, tokenData, timeToLive);
        request.post({
            url: apiUrl,
            form: postData,
            timeout: timeout
        }, function (error, response, body) {
            logger.info("sendOne result", error, response.statusCode, body);
            if (!error && response.statusCode == 200 && callback) {
                callback();
            }
        })
    });
};

HuaweiProvider.prototype.getPostData = function (push_type, notification, tokenData, timeToLive) {
    var postData = {
        access_token: this.access_token,
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
    var self = this;
    this.checkToken(function (tokenError) {
        if(!tokenError){
            logger.debug("sendAll ", notification, timeToLive);
            var postData = self.getPostData(2, notification, 0, timeToLive);
            request.post({
                url: apiUrl,
                form: postData
            }, function (error, response, body) {
                logger.info("sendAll result", error, response.statusCode, body);
                if (!error && response.statusCode == 200 && callback) {
                    callback();
                } else {
                    callback(error);
                }
            })
        } else {
            callback(tokenError);
        }
    });
};

HuaweiProvider.prototype.checkToken = function (callback) {
    var self = this;
    if (this.access_token && Date.now() < this.access_token_expire) {
        logger.debug("token valid");
        callback();
        return;
    } else {
        logger.info("request token");
        request.post({
            url: tokenUrl,
            form: {
                grant_type: "client_credentials",
                client_id: self.client_id,
                client_secret: self.client_secret
            },
            timeout: timeout
        }, function (error, response, body) {
            if (!error) {
                var data = JSON.parse(body);
                self.access_token = data.access_token;
                self.access_token_expire = Date.now() + data.expires_in * 1000 - 60 * 1000;
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