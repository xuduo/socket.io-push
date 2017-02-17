module.exports = (redis, tokenTTL) => {
    return new TokenService(redis, tokenTTL);
};

const logger = require('winston-proxy')('TokenService');

class TokenService {

    constructor(redis, tokenTTL) {
        this.redis = redis;
        this.tokenTTL = tokenTTL;
    }

    setApnNoToken(platform) {
        if (platform == "ios") {
            this.redis.setnx("pushIdToToken#" + oldPushId, JSON.stringify(
                {type: "apnNoToken"}
            ));
        }
    }

    delToken(type, token, bundleId) {
        if (type && token) {
            const tokenToPushIdKey = "tokenToPushId#" + type + "#" + token;
            this.redis.get(tokenToPushIdKey, (err, oldPushId) => {
                if (oldPushId) {
                    this.redis.del("pushIdToToken#" + oldPushId);
                }
                this.redis.del(tokenToPushIdKey);
                if (bundleId && type == "apn") {
                    this.redis.hdel("apnTokens#" + bundleId, token);
                }
            });
        }
    }

    setToken(data) {
        logger.debug("setToken ", data);
        if (data && data.pushId && data.token && data.type) {
            const pushId = data.pushId;
            delete data.pushId;
            const tokenData = JSON.stringify(data);
            const token = data.token;
            const tokenToPushIdKey = "tokenToPushId#" + data.type + "#" + token;
            this.redis.get(tokenToPushIdKey, (err, oldPushId) => {
                logger.debug("oldPushId %s", oldPushId);
                if (oldPushId && oldPushId != pushId) {
                    this.redis.del("pushIdToToken#" + oldPushId);
                    logger.debug("remove old pushId to token %s %s", oldPushId, tokenData);
                }
                this.redis.set(tokenToPushIdKey, pushId);
                const pushIdToTokenKey = "pushIdToToken#" + pushId;
                this.redis.set(pushIdToTokenKey, tokenData);
                this.redis.pexpire(pushIdToTokenKey, this.tokenTTL);
                this.redis.pexpire(tokenToPushIdKey, this.tokenTTL);
            });
            if (data.type == "apn" && data.bundleId && data.token) {
                logger.debug("addToken %j", data);
                this.redis.hset("apnTokens#" + data.bundleId, data.token, Date.now());
            }
        }
    }
}