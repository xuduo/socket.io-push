module.exports = NotificationService;

var logger = require('../log/index.js')('NotificationService');
var util = require('../util/util.js');
var apn = require('apn');
var apnTokenTTL = 3600 * 24 * 7;


function NotificationService(providerFactory, redis, ttlService) {
    if (!(this instanceof NotificationService)) return new NotificationService(providerFactory, redis, ttlService);
    this.redis = redis;
    this.ttlService = ttlService;
    this.providerFactory = providerFactory;
}

NotificationService.prototype.setThirdPartyToken = function (data) {
    logger.debug("setThirdPartyToken ", data);
    if (data && data.pushId && data.apnToken) {
        var pushId = data.pushId;
        delete data.pushId;
        this.providerFactory.addToken(data);
        var apnData = JSON.stringify(data);
        var apnToken = data.apnToken;
        var self = this;
        this.redis.get("apnTokenToPushId#" + apnToken, function (err, oldPushId) {
            logger.debug("oldPushId %s", oldPushId);
            if (oldPushId && oldPushId != pushId) {
                self.redis.del("pushIdToApnData#" + oldPushId);
                logger.debug("remove old pushId to apnToken %s %s", oldPushId, apnData);
            }
            self.redis.set("apnTokenToPushId#" + apnToken, pushId);
            self.redis.set("pushIdToApnData#" + pushId, apnData);
            self.redis.expire("pushIdToApnData#" + pushId, apnTokenTTL);
            self.redis.expire("apnTokenToPushId#" + apnToken, apnTokenTTL);
        });
    }
};

NotificationService.prototype.sendByPushIds = function (pushIds, timeToLive, notification, io) {
    var self = this;
    pushIds.forEach(function (pushId) {
        self.redis.get("pushIdToApnData#" + pushId, function (err, reply) {
            logger.debug("pushIdToApnData %s %s", pushId, JSON.stringify(reply));
            if (reply) {
                var apnData = JSON.parse(reply);
                self.providerFactory.sendOne(apnData, notification, timeToLive);
            } else {
                logger.debug("send notification to android %s", pushId);
                self.ttlService.addPacketAndEmit(pushId, 'noti', timeToLive, notification, io, true);
            }
        });
    });

};

NotificationService.prototype.sendAll = function (notification, timeToLive, io) {
    this.ttlService.addPacketAndEmit("noti", 'noti', timeToLive, notification, io, false);
    this.providerFactory.sendAll(notification, timeToLive);
};
