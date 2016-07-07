module.exports = UidStore;
const logger = require('../log/index.js')('UidStore');

function UidStore(redis, subClient) {
    if (!(this instanceof UidStore)) return new UidStore(redis, subClient);
    this.redis = redis;
}

UidStore.prototype.bindUid = function (pushId, uid, timeToLive, platform, platformLimit) {
    timeToLive = timeToLive || 3600 * 1000 * 24 * 14;
    platformLimit = platformLimit || 0;
    logger.debug("bindUid pushId %s %s", uid, pushId, platformLimit);
    const self = this;
    self.removePushId(pushId, false, function () {
        self.redis.hgetall("uidToPushId#" + uid, function (err, reply) {
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
                oldPlatformPushIds.sort(function (a, b) {
                    return b[1] - a[1];
                });
                for (let i = platformLimit - 1; i < oldPlatformPushIds.length; i++) {
                    toDelete.push(oldPlatformPushIds[i][0]);
                }
            }
            if (toDelete.length > 0) {
                self.redis.hdel("uidToPushId#" + uid, toDelete);
            }
            self.redis.hset("uidToPushId#" + uid, pushId, platform + "," + Date.now() + "," + timeToLive);
            self.redis.set("pushIdToUid#" + pushId, uid);
        });
    });
};

UidStore.prototype.removePushId = function (pushId, removePushIdToUid, callback) {
    logger.debug("removePushId pushId  %s", pushId);
    const key = "pushIdToUid#" + pushId;
    const self = this;
    this.redis.get(key, function (err, oldUid) {
        if (oldUid) {
            self.redis.hdel("uidToPushId#" + oldUid, pushId, function () {
                if (removePushIdToUid) {
                    self.redis.del(key, callback);
                    if (callback) {
                        callback();
                    }
                } else {
                    if (callback) {
                        callback();
                    }
                }
            });
        } else {
            if (callback) {
                callback();
            }
        }
    });
};

UidStore.prototype.removeUid = function (uid) {
    logger.debug("removePushId pushId  %s", uid);
    const self = this;
    this.getPushIdByUid(uid, function (pushIds) {
        if (pushIds) {
            pushIds.forEach(function (pushId) {
                self.redis.del("pushIdToUid#" + pushId);
            });
        }
        self.redis.del("uidToPushId#" + uid);
    });
};

UidStore.prototype.getUidByPushId = function (pushId, callback) {
    this.redis.get("pushIdToUid#" + pushId, function (err, uid) {
        logger.debug("getUidByPushId %s %s", pushId, uid);
        callback(uid);
    });
};

UidStore.prototype.getPushIdByUid = function (uid, callback) {
    this.redis.hkeys("uidToPushId#" + uid, function (err, reply) {
        if (reply) {
            const pushIds = [];
            reply.forEach(function (val) {
                pushIds.push(val);
            });
            callback(pushIds);
        }
    });
};
