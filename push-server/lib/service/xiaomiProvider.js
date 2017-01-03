module.exports = (config, arrivalStats) => {
    return new XiaomiProvider(config, arrivalStats);
};

const logger = require('winston-proxy')('XiaomiProvider');

const util = require('socket.io-push-redis/util');
const request = require('request');
const sendOneUrl = "https://api.xmpush.xiaomi.com/v3/time_to_live/regid";
const sendAllUrl = "https://api.xmpush.xiaomi.com/v3/message/all";
const traceUrl = "https://api.xmpush.xiaomi.com/v1/trace/message/status";
const timeout = 5000;

class XiaomiProvider {

    constructor(config, arrivalStats) {
        this.arrivalStats = arrivalStats;
        this.headers = {
            'Authorization': 'key=' + config.app_secret
        };
        this.type = "xiaomi";
        this.notify_foreground = config.notify_foreground || 1;
    }

    sendMany(notification, tokenDataList, timeToLive, callback) {
        if (notification.android.title) {
            request.post({
                url: sendOneUrl,
                form: this.getPostData(notification, tokenDataList, timeToLive),
                headers: this.headers,
                timeout: timeout
            }, (error, response, body) => {
                logger.debug("sendOne result", error, response && response.statusCode, body);
                if (this.success(error, response, body, callback, notification.id)) {
                    return;
                }
                logger.error("sendOne error", error, response && response.statusCode, body);
            })
        }
    }

    getPostData(notification, tokenDataList, timeToLive) {
        logger.debug("getPostData notification ", notification, ": tokenlist: ", tokenDataList);
        const postData = {
            title: notification.android.title,
            description: notification.android.message,
            notify_id: util.hash(notification.id),
            "extra.notify_foreground": this.notify_foreground,
            payload: JSON.stringify({android: notification.android, id: notification.id})
        };
        if (tokenDataList) {
            postData.registration_id = tokenDataList.map((tokenData) => {
                return tokenData.token;
            }).join();
        }
        if (timeToLive > 0) {
            postData.time_to_live = timeToLive;
        } else {
            postData.time_to_live = 0;
        }
        return postData;
    }

    sendAll(notification, timeToLive, callback) {
        if (notification.android.title) {
            request.post({
                url: sendAllUrl,
                form: this.getPostData(notification, 0, timeToLive),
                headers: this.headers,
                timeout: timeout
            }, (error, response, body) => {
                logger.info("sendAll result", error, response && response.statusCode, body);
                if (this.success(error, response, body, callback, notification.id)) {
                    return;
                }
                logger.error("sendAll error", error, response && response.statusCode, body);
            });
        }
    }

    success(error, response, body, callback, notificationId) {
        if (callback) {
            callback(error);
        }
        if (!error && response && response.statusCode == 200) {
            const result = JSON.parse(body);
            logger.debug("response result ", result);
            if (result.data && result.data.id) {
                this.arrivalStats.setArrivalInfo(notificationId, "xiaomi_msg_id", result.data.id);
            }
            if (result.code == 0 || result.code == 20301) {
                return true;
            }
        }
        return false;
    }

    trace(packetInfo, callback) {
        if (packetInfo.xiaomi_msg_id) {
            request.get({
                url: traceUrl,
                qs: {msg_id: packetInfo.xiaomi_msg_id},
                headers: this.headers,
                timeout: timeout
            }, (error, response, body) => {
                logger.info("trace result", error, response && response.statusCode, body);
                try {
                    const result = JSON.parse(body);
                    if (result.data && result.data.data) {
                        delete packetInfo.xiaomi_msg_id;
                        packetInfo.xiaomi = result.data.data;
                    }
                } catch (e) {
                }
                callback();
            });
        } else {
            callback();
        }

    }
}