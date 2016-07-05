module.exports = XiaomiProvider;

var logger = require('../log/index.js')('XiaomiProvider');

var util = require('../util/util.js');
var request = require('request');
var sendOneUrl = "https://api.xmpush.xiaomi.com/v3/message/regid";
var sendAllUrl = "https://api.xmpush.xiaomi.com/v3/message/all";
var timeout = 5000;

function XiaomiProvider(config, stats) {
    if (!(this instanceof XiaomiProvider)) return new XiaomiProvider(config, stats);
    this.stats = stats;
    this.headers = {
        'Authorization': 'key=' + config.app_secret
    };
    this.type = "xiaomi";
    this.notify_foreground = config.notify_foreground || 1;
}

XiaomiProvider.prototype.sendOne = function (notification, tokenData, timeToLive, callback) {
    if (notification.android.title) {
        var self = this;
        self.stats.addPushTotal(1, self.type);
        request.post({
            url: sendOneUrl,
            form: this.getPostData(notification, tokenData, timeToLive),
            headers: this.headers,
            timeout: timeout
        }, function (error, response, body) {
            logger.debug("sendOne result", error, response && response.statusCode, body);
            if (success(error, response, body, callback)) {
                self.stats.addPushSuccess(1, self.type);
                return;
            }
            logger.error("sendOne error", error, response && response.statusCode, body);
        })
    }
};

XiaomiProvider.prototype.getPostData = function (notification, tokenData, timeToLive) {
    logger.debug("getPostData notification ", notification);
    var postData = {
        title: notification.android.title,
        description: notification.android.message,
        notify_id: util.hash(notification.id),
        "extra.notify_foreground": this.notify_foreground,
        payload: JSON.stringify({android: notification.android, id: notification.id})
    };
    if (tokenData && tokenData.token) {
        postData.registration_id = tokenData.token;
    }
    if (timeToLive > 0) {
        postData.time_to_live = timeToLive;
    } else {
        postData.time_to_live = 0;
    }
    return postData;
}

XiaomiProvider.prototype.addToken = function (data) {

};

XiaomiProvider.prototype.sendAll = function (notification, timeToLive, callback) {
    if (notification.android.title) {
        var self = this;
        self.stats.addPushTotal(1, self.type + "All");
        logger.debug("addPushTotal");
        request.post({
            url: sendAllUrl,
            form: this.getPostData(notification, 0, timeToLive),
            headers: this.headers,
            timeout: timeout
        }, function (error, response, body) {
            logger.info("sendAll result", error, response && response.statusCode, body);
            if (success(error, response, body, callback)) {
                self.stats.addPushSuccess(1, self.type + "All");
                return;
            }
            logger.error("sendAll error", error, response && response.statusCode, body);
        });
    }
};

function success(error, response, body, callback) {
    if (callback) {
        callback(error);
    }
    if (!error && response && response.statusCode == 200) {
        var result = JSON.parse(body);
        if (result.code == 0 || result.code == 20301) {
            return true;
        }
    }
    return false;
}