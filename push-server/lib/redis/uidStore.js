module.exports = (redis) => {
    return new UidStore(redis);
};
const logger = require('winston-proxy')('UidStore');

class UidStore {

    constructor(redis) {
        this.redis = redis;
    }

    bindUid(pushId, uid, timeToLive = 3600 * 1000 * 24 * 14, platform = 0, platformLimit) {
        logger.debug("bindUid pushId %s %s", uid, pushId, platformLimit);
        this.removePushId(pushId, false, () => {
            this.redis.hgetall("uidToPushId#" + uid, (err, reply) => {
                const toDelete = [];
                const oldPlatformPushIds = [];
                if (reply) {
                    const current = Date.now();
                    for (const key in reply) {
                        if (key != pushId) {
                            const val = reply[key].split(",");
                            if (current > val[1] + val[2]) {
                                toDelete.push(key);
                            } else if (val[0] == platform && platformLimit > 0) {
                                oldPlatformPushIds.push([key, val[1]]);
                            }
                        }
                    }
                }
                if (oldPlatformPushIds.length > 0 && oldPlatformPushIds.length > platformLimit - 1) {
                    oldPlatformPushIds.sort((a, b) => {
                        return b[1] - a[1];
                    });
                    for (let i = platformLimit - 1; i < oldPlatformPushIds.length; i++) {
                        toDelete.push(oldPlatformPushIds[i][0]);
                    }
                }
                if (toDelete.length > 0) {
                    this.redis.hdel("uidToPushId#" + uid, toDelete);
                }
                this.redis.hset("uidToPushId#" + uid, pushId, platform + "," + Date.now() + "," + timeToLive);
                this.redis.set("pushIdToUid#" + pushId, uid);
            });
        });
    }

    removePushId(pushId, removePushIdToUid, callback) {
        logger.debug("removePushId pushId  %s", pushId);
        const key = "pushIdToUid#" + pushId;
        this.redis.get(key, (err, oldUid) => {
            if (oldUid) {
                this.redis.hdel("uidToPushId#" + oldUid, pushId, () => {
                    if (removePushIdToUid) {
                        this.redis.del(key, callback);
                    }
                    if (callback) {
                        callback();
                    }
                });
            } else {
                if (callback) {
                    callback();
                }
            }
        });
    }

    removeUid(uid) {
        logger.debug("removePushId pushId  %s", uid);
        this.getPushIdByUid(uid, (pushIds) => {
            if (pushIds) {
                pushIds.forEach((pushId) => {
                    this.redis.del("pushIdToUid#" + pushId);
                });
            }
            this.redis.del("uidToPushId#" + uid);
        });
    }

    getUidByPushId(pushId, callback) {
        this.redis.get("pushIdToUid#" + pushId, (err, uid) => {
            logger.debug("getUidByPushId %s %s", pushId, uid);
            callback(uid);
        });
    }

    getPushIdByUid(uid, callback) {
        this.redis.hkeys("uidToPushId#" + uid, (err, reply) => {
            if (reply) {
                const pushIds = [];
                reply.forEach((val)=> {
                    pushIds.push(val);
                });
                callback(pushIds);
            }
        });
    }

}
