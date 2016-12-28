module.exports = (providerFactory, redis, ttlService, tokenTTL, arrivalRate) => {
    return new NotificationService(providerFactory, redis, ttlService, tokenTTL, arrivalRate);
};

const logger = require('winston-proxy')('NotificationService');
const randomstring = require("randomstring");
const async = require('async');

class NotificationService {

    constructor(providerFactory, redis, ttlService, tokenTTL, arrivalRate) {
        this.redis = redis;
        this.ttlService = ttlService;
        this.providerFactory = providerFactory;
        this.tokenTTL = tokenTTL;
        this.arrivalRate = arrivalRate;
    }

    getTokenDataByPushId(pushId, callback) {
        this.redis.get("pushIdToToken#" + pushId, (err, reply) => {
            let token;
            if (reply) {
                token = JSON.parse(reply);
            }
            callback(token);
        });
    }

    sendByPushIds(pushIds, timeToLive, notification) {
        this.addIdAndTimestamp(notification);

        const mapTypeToToken = {};
        async.each(pushIds, (pushId, callback) => {
            //集合元素并发执行,如果全部未出错,则最后callback中err为undefined;
            // 否则如果中途出错,直接调用callback,其他未执行完的任务继续(只执行一次callback..)
            this.getTokenDataByPushId(pushId, (token) => {
                logger.debug('pushId: %s to token: %j', pushId, token);
                if (token) {  //小米&华为&苹果之外的终端没有对应的token
                    const tokenList = mapTypeToToken[token.type] || [];
                    tokenList.push(token);
                    mapTypeToToken[token.type] = tokenList;
                } else {
                    logger.debug("send notification in socket.io, connection %s", pushId);
                    if (notification.android.title) {
                        this.ttlService.addTTL(pushId, 'noti', timeToLive, notification, true);
                        this.ttlService.emitPacket(pushId, 'noti', notification);
                    }
                }
                callback();
            });
        }, () => {
            this.providerFactory.sendMany(notification, mapTypeToToken, timeToLive);
        });
    }

    sendAll(notification, timeToLive) {
        this.addIdAndTimestamp(notification);
        if (this.ttlService && notification.android.title) {
            this.arrivalRate.startToStats('noti', notification, timeToLive);
            this.ttlService.addTTL("noti", 'noti', timeToLive, notification, false);
            // 小米,华为,苹果不订阅 "noti"
            this.ttlService.emitPacket("noti", 'noti', notification);
        }
        this.providerFactory.sendAll(notification, timeToLive);
    }

    addIdAndTimestamp(notification) {
        if (!notification.id) {
            notification.id = randomstring.generate(12);
        }
        if (!notification.timestamp) {
            notification.timestamp = Date.now();
        }
    }
}


