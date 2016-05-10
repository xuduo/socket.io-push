module.exports = XiaomiProvider;

var logger = require('../log/index.js')('XiaomiProvider');

var util = require('../util/util.js');
var request = require('request');
var sendOneUrl = "https://api.xmpush.xiaomi.com/v3/message/regid";
var sendAllUrl = "https://api.xmpush.xiaomi.com/v3/message/all";
var timeout = 5000;

function XiaomiProvider(config) {
    if (!(this instanceof XiaomiProvider)) return new XiaomiProvider(config);
    this.headers = {
        'Authorization': 'key=' + config.app_secret
    };
    this.type = "xiaomi";
    this.notify_foreground = config.notify_foreground || 1;
}

XiaomiProvider.prototype.sendOne = function (notification, tokenData, timeToLive, callback) {
    request.post({
        url: sendOneUrl,
        form: this.getPostData(notification, tokenData, timeToLive),
        headers: this.headers,
        timeout: timeout
    }, function (error, response, body) {
        logger.info("sendAll result", error, response.statusCode, body);
        if (!error && response.statusCode == 200 && callback) {
            var result = JSON.parse(body);
            if (result.code == 0) {
                callback();
            }
        }
    })
};

XiaomiProvider.prototype.getPostData = function (notification, tokenData, timeToLive) {
    logger.debug("getPostData notification ", notification);
    var postData = {
        title: notification.android.title,
        description: notification.android.message,
        notify_id: notification.id,
        "extra.notify_foreground": this.notify_foreground,
        payload: JSON.stringify({android: notification.android, id: notification.id})
    };
    if (tokenData && tokenData.token) {
        postData.registration_id = tokenData.token;
    }
    if (timeToLive > 0) {
        postData.time_to_live = timeToLive;
    }
    return postData;
}

XiaomiProvider.prototype.addToken = function (data) {

};

XiaomiProvider.prototype.sendAll = function (notification, timeToLive, callback) {
    request.post({
        url: sendAllUrl,
        form: this.getPostData(notification, 0, timeToLive),
        headers: this.headers,
        timeout: timeout
    }, function (error, response, body) {
        logger.info("sendAll result", error, response.statusCode, body);
        if (!error && response.statusCode == 200 && callback) {
            var result = JSON.parse(body);
            if (result.code == 0) {
                callback();
            }
        }
    })
};