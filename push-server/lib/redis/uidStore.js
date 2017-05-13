module.exports = (redis, mongo, io) => {
    return new UidStore(redis, mongo, io);
};
const logger = require('winston-proxy')('UidStore');

class UidStore {

    constructor(redis, mongo, io) {
        this.redis = redis;
        this.mongo = mongo;
        if (io) {
            this.redis.subscribe("cmd:bindUid");
            this.redis.subscribe("cmd:unbindUid");
            this.redis.on('message', (channel, message) => {
                if (channel == 'cmd:bindUid') {
                    let json = JSON.parse(message);
                    io.nsps['/'].adapter.doSocketInRoom(io.nsps['/'], json.pushId, (socket) => {
                        logger.debug("redis bindUid join ", json);
                        socket.setUid(json.uid);
                    });
                } else if (channel == 'cmd:unbindUid') {
                    let json = JSON.parse(message);
                    let room = json.pushId || "uid:" + json.uid;

                    io.nsps['/'].adapter.doSocketInRoom(io.nsps['/'], room, (socket) => {
                        logger.debug("redis unbindUid leave ", message);
                        socket.setUid(null);
                    });
                }
            });
        }
    }

    publishBindUid(pushId, uid) {
        this.redis.publish("cmd:bindUid", JSON.stringify({pushId: pushId, uid: uid}));
    }

    publishUnbindUid(pushId, uid) {
        this.redis.publish("cmd:unbindUid", JSON.stringify({pushId: pushId, uid: uid}));
    }

    bindUid(pushId, uid, platform, platformLimit = 0) {
        logger.debug("bindUid pushId %s %s", uid, pushId, platformLimit);
        const device = {uid, updateTime: Date.now()};
        if (platform) {
            device.platform = platform;
        }

        this.mongo.device.update({_id: pushId}, device, {upsert: true}, (err) => {
            logger.debug('update uid success ', pushId, uid);
            if (!err) {
                if (platformLimit > 0) {
                    this.mongo.device.find({uid, platform}).sort('-updateTime').exec((err, devices) => {
                        if (!err && devices) {
                            for (let i = 0; i < devices.length; i++) {
                                if (i >= platformLimit) {
                                    this.mongo.device.update({_id: devices[i].id}, {
                                        $unset: {uid: 1},
                                        updateTime: Date.now()
                                    }, (err) => {
                                        if (err) {
                                            logger.error('mongodb write error', err);
                                        }
                                    });
                                }
                            }
                        }
                    });
                }
            }
        });


    }

    removePushId(pushId) {
        logger.debug("removePushId pushId  %s", pushId);
        this.mongo.device.update({_id: pushId}, {$unset: {uid: 1}}, (err) => {
            if (err) {
                logger.error('mongodb removePushId error', err);
            }
        });
    }

    removeUid(uid) {
        this.mongo.device.update({uid}, {$unset: {uid: 1}}, {multi: true}, (err) => {
            logger.debug("removeUid uid  ", uid, err);
            if (err) {
                logger.error('mongodb removePushId error', err);
            }
        });
    }

    getUidByPushId(pushId, callback) {
        this.mongo.device.findById(pushId, (err, device) => {
            logger.debug("getUidByPushId %s %s", pushId, device);
            if (!err && device) {
                callback(device.uid);
            } else {
                callback();
            }
        });
    }

    getPushIdByUid(uid, callback) {
        this.mongo.device.find({uid: uid}, (err, devices) => {
            const pushIds = [];
            logger.debug("getPushIdByUid %s %s", uid, devices);
            if (!err && devices) {
                devices.forEach((device) => {
                    pushIds.push(device.id);
                });
            }
            callback(pushIds);
        });
    }

    getPlatformByUid(uid, callback) {
        this.mongo.device.find({uid: uid}, (err, devices) => {
            const platforms = {};
            logger.debug("getUidByPushId %s %s", pushId, devices);
            if (!err && devices) {
                devices.forEach((device) => {
                    platforms[device.id] = device.platform;
                });
            }
            callback(platforms);
        });
    }

}
