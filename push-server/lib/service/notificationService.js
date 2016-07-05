module.exports = NotificationService;

var logger = require('../log/index.js')('NotificationService');
var util = require('../util/util.js');
var apn = require('apn');
var randomstring = require("randomstring");

function NotificationService(providerFactory, redis, ttlService, tokenTTL) {
    if (!(this instanceof NotificationService)) return new NotificationService(providerFactory, redis, ttlService, tokenTTL);
    this.redis = redis;
    this.ttlService = ttlService;
    this.providerFactory = providerFactory;
    this.tokenTTL = tokenTTL;
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
            self.redis.pexpire(pushIdToTokenKey, self.tokenTTL);
            self.redis.pexpire(tokenToPushIdKey, self.tokenTTL);
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

NotificationService.prototype.sendByPushIds = function (pushIds, timeToLive, notification) {
    var self = this;
    addIdAndTimestamp(notification);
    pushIds.forEach(function (pushId) {
        self.getTokenDataByPushId(pushId, function (token) {
            if (token) {
                self.providerFactory.sendOne(notification, token, timeToLive);
            } else if (self.ttlService) {
                logger.debug("send notification in socket.io connection %s", pushId);
                if (notification.android.title) {
                    self.ttlService.addTTL(pushId, 'noti', timeToLive, notification, true);
                    self.ttlService.emitPacket(pushId, 'noti', notification);
                }
            }
        });
    });
};

NotificationService.prototype.sendAll = function (notification, timeToLive) {
    addIdAndTimestamp(notification);
    if (this.ttlService && notification.android.title) {
        this.ttlService.addTTL("noti", 'noti', timeToLive, notification, false);
        this.ttlService.emitPacket("noti", 'noti', notification);
    }
    this.providerFactory.sendAll(notification, timeToLive);
};

function addIdAndTimestamp(notification) {
    if (!notification.id) {
        notification.id = randomstring.generate(12);
    }
    if (!notification.timestamp) {
        notification.timestamp = Date.now();
    }
}
