module.exports = NotificationService;

var logger = require('../log/index.js')('NotificationService');
var util = require('../util/util.js');
var apn = require('apn');
var tokenTTL = 3600 * 24 * 7;


function NotificationService(providerFactory, redis, ttlService) {
    if (!(this instanceof NotificationService)) return new NotificationService(providerFactory, redis, ttlService);
    this.redis = redis;
    this.ttlService = ttlService;
    this.providerFactory = providerFactory;
}

NotificationService.prototype.setThirdPartyToken = function (data) {
    logger.debug("setThirdPartyToken ", data);
    if (data && data.pushId && data.token) {
        var pushId = data.pushId;
        delete data.pushId;
        this.providerFactory.addToken(data);
        var tokenData = JSON.stringify(data);
        var token = data.token;
        var self = this;
        var tokenToPushIdKey = "tokenToPushId#" + data.type + "#" + token;
        this.redis.get(tokenToPushIdKey, function (err, oldPushId) {
            logger.debug("oldPushId %s", oldPushId);
            if (oldPushId && oldPushId != pushId) {
                self.redis.del("pushIdToToken#" + oldPushId);
                logger.debug("remove old pushId to token %s %s", oldPushId, tokenData);
            }
            self.redis.set(tokenToPushIdKey, pushId);
            var pushIdToTokenKey = "pushIdToToken#" + pushId;
            self.redis.set(pushIdToTokenKey, tokenData);
            self.redis.expire(pushIdToTokenKey, tokenTTL);
            self.redis.expire(tokenToPushIdKey, tokenTTL);
        });
    }
};
NotificationService.prototype.getTokenDataByPushId = function (pushId, callback) {
    this.redis.get("pushIdToToken#" + pushId, function (err, reply) {
        logger.debug("pushIdToToken %s %j", pushId, reply);
        var token;
        if (reply) {
            token = JSON.parse(reply);
        }
        callback(token);
    });
}
NotificationService.prototype.sendByPushIds = function (pushIds, timeToLive, notification, io) {
    var self = this;
    pushIds.forEach(function (pushId) {
        self.getTokenDataByPushId(pushId, function (token) {
            if (token) {
                self.providerFactory.sendOne(notification, token, timeToLive);
            } else if (self.ttlService) {
                logger.debug("send notification in socket.io connection %s", pushId);
                self.ttlService.addPacketAndEmit(pushId, 'noti', timeToLive, notification, io, true);
            }
        });
    });
};

NotificationService.prototype.sendAll = function (notification, timeToLive, io) {
    if (this.ttlService) {
        this.ttlService.addPacketAndEmit("noti", 'noti', timeToLive, {android: notification.android}, io, false);
        this.ttlService.addPacketAndEmit("bnoti", 'bnoti', timeToLive, {browser: notification.browser || notification.android}, io, false);
    }
    this.providerFactory.sendAll(notification, timeToLive);
};
