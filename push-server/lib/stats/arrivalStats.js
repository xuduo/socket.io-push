module.exports = (redis, topicOnline, xiaomiProvider) => {
    return new ArrivalStats(redis, topicOnline, xiaomiProvider);
};

const logger = require('winston-proxy')('ArrivalStats');
const async = require('async');

const getArrivalInfoKey = (msgId) => {
    return 'stats:arrival:' + msgId;
};
const getArrivalListKey = (topic) => {
    return 'stats:arrivalList:' + topic;
};

class ArrivalStats {

    constructor(redis, topicOnline, xiaomiProvider) {
        this.redis = redis;
        this.topicOnline = topicOnline;
        this.recordKeepTime = 30 * 24 * 3600 * 1000;
        this.maxrecordKeep = -50;
        this.xiaomiProvider = xiaomiProvider;
    }

    addArrivalInfo(msgId, key, incr) {
        const packetInfoKey = getArrivalInfoKey(msgId);
        if (incr > 0) {
            this.redis.ttl(packetInfoKey, (err, ttl) => {
                if (!err && ttl > 0) {
                    logger.debug('send packet, packet:%s, count: ', msgId, incr);
                    this.redis.hincrby(packetInfoKey, key, incr);
                }
            });
        }
    }

    setArrivalInfo(msgId, key, value) {
        const packetInfoKey = getArrivalInfoKey(msgId);
        this.redis.ttl(packetInfoKey, (err, ttl) => {
            if (!err && ttl > 0) {
                logger.debug('setPacketInfo ', msgId, value);
                this.redis.hset(packetInfoKey, key, value);
            }
        });
    }

    setArrivalList(type, msgId) {
        const listKey = getArrivalListKey(type);
        this.redis.rpush(listKey, msgId);
        this.redis.ltrim(listKey, this.maxrecordKeep, -1);
    }

    setPacketInfo(key, msg, ttl, callback) {
        this.redis.hsetnx(key, 'id', msg.id, (err, ret) => {
            if (!err && ret == 1) {
                this.redis.hmset(key,
                    'notification', JSON.stringify(msg.android),
                    'timeStart', new Date().getTime(),
                    'ttl', ttl);
                this.redis.pexpire(key, this.recordKeepTime);
                callback(true);
            } else {
                callback(false);
            }
        });
    }

    addPushAll(msg, ttl) {
        logger.info('addPushAll, packet:%s', msg.id);
        const packetInfoKey = getArrivalInfoKey(msg.id);
        this.setPacketInfo(packetInfoKey, msg, ttl, (ret) => {
            if (ret) {
                logger.info('addPushAll: start to stats packet:%s', msg.id);
                this.setArrivalList('noti', msg.id);
            }
        });
        this.topicOnline.getTopicOnline('noti', (count) => {
            logger.info('packet(%s) init count:%d', msg.id, count);
            this.redis.hincrby(packetInfoKey, 'target_android', count);
        })
    }

    addPushMany(msg, ttl, sentCount) {
        logger.info('addPushMany, packet: %s', msg.id);
        const packetInfoKey = getArrivalInfoKey(msg.id);
        this.setPacketInfo(packetInfoKey, msg, ttl, (ret) => {
            if (ret) {
                logger.info('addPushMany: start to stats packet: %s', msg.id);
                this.setArrivalList('group', msg.id);
            }
        });
        this.redis.hincrby(packetInfoKey, 'target_android', sentCount);
    }

    getRateStatusByType(type, callback) {
        const result = [];
        this.redis.lrange(getArrivalListKey(type), 0, -1, (err, data) => {
            async.each(data, (id, asynccb) => {
                this.getArrivalInfo(id, (info)=> {
                    if (info) {
                        result.push(info);
                    }
                    asynccb();
                });
            }, (err) => {
                if (err) logger.error('error: ' + err);
                result.sort((l, r) => {
                    return new Date(r.timeStart) - new Date(l.timeStart);
                });
                callback(result);
            });
        });
    }

    getArrivalInfo(id, callback) {
        const key = getArrivalInfoKey(id);
        this.redis.hgetall(key, (err, reply) => {
            if (err) {
                logger.error('fail to read packet info, key:%s, reaon:%s', key, err);
                callback();
                return;
            }
            const packet = {};
            logger.debug('reply: ', id, reply);
            for (const key in reply) {
                packet[key] = reply[key];
            }
            packet.timeValid = new Date(parseInt(packet.timeStart) + parseInt(packet.ttl)).toLocaleString();
            packet.timeStart = new Date(parseInt(packet.timeStart)).toLocaleString();
            let apn = {};
            apn.target = parseInt(packet.target_apn);
            apn.arrive = parseInt(packet.arrive_apn);
            apn.arrivalRate = apn.target != 0 ? apn.arrive / apn.target : 0;
            delete packet.target_apn;
            delete packet.arrive_apn;
            if (apn.target > 0) {
                packet.apn = apn;
            }

            let android = {};
            android.target = parseInt(packet.target_android);
            android.arrive = parseInt(packet.arrive_android);
            android.arrivalRate = android.target != 0 ? android.arrive / android.target : 0;
            delete packet.target_android;
            delete packet.arrive_android;
            if (android.target > 0) {
                packet.android = android;
            }

            if (this.xiaomiProvider) {
                this.xiaomiProvider.trace(packet, ()=> {
                    callback(packet);
                });
            } else {
                callback(packet);
            }
        });
    }

}