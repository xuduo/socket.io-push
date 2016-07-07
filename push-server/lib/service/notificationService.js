module.exports = NotificationService;

const logger = require('../log/index.js')('NotificationService');
const util = require('../util/util.js');
const apn = require('apn');
const randomstring = require("randomstring");
const async = require('async');

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
        const pushId = data.pushId;
        delete data.pushId;
        this.providerFactory.addToken(data);
        const tokenData = JSON.stringify(data);
        const token = data.token;
        const self = this;
        const tokenToPushIdKey = "tokenToPushId#" + data.type + "#" + token;
        this.redis.get(tokenToPushIdKey, function (err, oldPushId) {
            logger.debug("oldPushId %s", oldPushId);
            if (oldPushId && oldPushId != pushId) {
                self.redis.del("pushIdToToken#" + oldPushId);
                logger.debug("remove old pushId to token %s %s", oldPushId, tokenData);
            }
            self.redis.set(tokenToPushIdKey, pushId);
            const pushIdToTokenKey = "pushIdToToken#" + pushId;
            self.redis.set(pushIdToTokenKey, tokenData);
            self.redis.pexpire(pushIdToTokenKey, self.tokenTTL);
            self.redis.pexpire(tokenToPushIdKey, self.tokenTTL);
        });
    }
};

NotificationService.prototype.getTokenDataByPushId = function (pushId, callback) {
    this.redis.get("pushIdToToken#" + pushId, function (err, reply) {
        let token;
        if (reply) {
            token = JSON.parse(reply);
        }
        callback(token);
    });
}

NotificationService.prototype.sendByPushIds = function (pushIds, timeToLive, notification) {
    const self = this;
    addIdAndTimestamp(notification);

    const mapTypeToToken = {};
    async.each(pushIds, function(pushId, callback){  //集合元素并发执行,如果全部未出错,则最后callback中err为undefined; 否则如果中途出错,直接调用callback,其他未执行完的任务继续(只执行一次callback..)
        self.getTokenDataByPushId(pushId, function(token){
            logger.debug('pushId: %s to token: %j', pushId, token);
            if(token){  //小米&华为&苹果之外的终端没有对应的token
                const tokenList = mapTypeToToken[token.type] || [];
                tokenList.push(token);
                mapTypeToToken[token.type] = tokenList;
            } else {
                logger.debug("send notification in socket.io, connection %s", pushId);
                if(notification.android.title){
                    self.ttlService.addTTL(pushId, 'noti', timeToLive, notification, true);
                    self.ttlService.emitPacket(pushId, 'noti', notification);
                }
            }
            callback();
        });
    }, function(){
        self.providerFactory.sendMany(notification, mapTypeToToken, timeToLive);
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
