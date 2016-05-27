module.exports = UidStore;
var logger = require('../log/index.js')('UidStore');

function UidStore(redis, subClient) {
    if (!(this instanceof UidStore)) return new UidStore(redis, subClient);
    this.redis = redis;
}

UidStore.prototype.bindUid = function (pushId, uid, timeToLive, platform, platformUnique) {
    logger.debug("bindUid pushId %s %s", uid, pushId);
    var self = this;
    this.getUidByPushId(pushId, function (oldUid) {
        self.removePushIdFromUid(pushId, oldUid);
        self.getPushIdDataByUid(uid, function (data) {
            if (!platform) {
                platform = "default";
            }
            if (!data[platform]) {
                data[platform] = {};
            }
            if (platformUnique == "true") {
                for (var pushIdOld in data[platform]) {
                    self.redis.del("pushIdToUid#" + pushIdOld);
                }
                data[platform] = {};
            }
            data[platform][pushId] = Date.now() + timeToLive;
            logger.debug("wwww ", data);
            self.redis.set("uidToPushId#" + uid, JSON.stringify(data));
            self.redis.set("pushIdToUid#" + pushId, uid);
        });
    });
};
UidStore.prototype.removePushIdFromUid = function (pushId, uid) {
    if (uid) {
        logger.debug("remove %s from old uid %s", pushId, uid);
        var self = this;
        self.getPushIdDataByUid(uid, function (data) {
            for (var platform in data) {
                delete data[platform][pushId];
            }
            self.redis.set("uidToPushId#" + uid, JSON.stringify(data));
        });
    }
}
UidStore.prototype.removePushId = function (pushId) {
    logger.debug("removePushId pushId  %s", pushId);
    var key = "pushIdToUid#" + pushId;
    var self = this;
    this.redis.get(key, function (err, oldUid) {
        if (oldUid) {
            logger.debug("remove %s from old uid %s", pushId, oldUid);
            self.getPushIdDataByUid(oldUid, function (data) {
                for (var platform in data) {
                    delete data[platform][pushId];
                }
                self.redis.set("uidToPushId#" + oldUid, JSON.stringify(data));
                self.redis.del(key);
            });
        }
    });
};

UidStore.prototype.getUidByPushId = function (pushId, callback) {
    this.redis.get("pushIdToUid#" + pushId, function (err, uid) {
        logger.debug("getUidByPushId %s %s", pushId, uid);
        callback(uid);
    });
};

UidStore.prototype.getPushIdDataByUid = function (uid, callback) {
    this.redis.get("uidToPushId#" + uid, function (err, reply) {
        var data;
        if (!err && reply) {
            data = JSON.parse(reply);
        } else {
            data = {};
        }
        logger.debug("qqq ", data);
        callback(data);
    });
};

UidStore.prototype.getPushIdByUid = function (uid, callback) {
    this.getPushIdDataByUid(uid, function (data) {
        var pushIds = [];
        for (var platform in data) {
            for (var pushId in data[platform]) {
                pushIds.push(pushId);
            }
        }
        if (pushIds) {
            callback(pushIds);
        }
    });
};
