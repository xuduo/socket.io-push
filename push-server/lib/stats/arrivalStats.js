module.exports = (redis, topicOnline, xiaomiProvider) => {
    return new ArrivalStats(redis, topicOnline, xiaomiProvider);
};

const logger = require('winston-proxy')('ArrivalStats');
const async = require('async');

const getArrivalInfoKey = (msgId) => {
    return 'stats#arrival#' + msgId;
};
const getArrivalListKey = (topic) => {
    return 'stats#arrivalList#' + topic;
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
        this.redis.lpush(listKey, msgId);
        this.redis.ltrim(listKey, this.maxrecordKeep, -1);
    }

    setPacketInfo(key, msg, ttl) {
        this.redis.hmset(key, 'id', msg.id,
            'android', JSON.stringify(msg.android),
            'apn', JSON.stringify(msg.apn),
            'timeStart', new Date().getTime(),
            'ttl', ttl);
        this.redis.pexpire(key, this.recordKeepTime);
    }

    addPushAll(msg, ttl) {
        logger.info('addPushAll: start to stats packet:%s', msg.id);
        this.setArrivalList('noti', msg.id);

        const packetInfoKey = getArrivalInfoKey(msg.id);
        this.setPacketInfo(packetInfoKey, msg, ttl);
        this.topicOnline.getTopicOnline('noti', (count) => {
            logger.info('packet(%s) init count:%d', msg.id, count);
            this.redis.hset(packetInfoKey, 'target_android', count);
            this.redis.hset(packetInfoKey, 'arrive_android', 0);
        })
    }

    addPushMany(msg, ttl, sentCount) {
        logger.info('addPushMany: start to stats packet: %s', msg.id);
        this.setArrivalList('group', msg.id);

        const packetInfoKey = getArrivalInfoKey(msg.id);
        this.setPacketInfo(packetInfoKey, msg, ttl);
        this.redis.hset(packetInfoKey, 'target_android', sentCount);
        this.redis.hset(packetInfoKey, 'arrive_android', 0);
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
            apn.msg = packet.apn;
            apn.target = parseInt(packet.target_apn);
            apn.arrive = parseInt(packet.arrive_apn);
            apn.arrivalRate = apn.target != 0 ? apn.arrive / apn.target : 0;
            delete packet.apn;
            delete packet.target_apn;
            delete packet.arrive_apn;
            packet.apn = apn;

            let android = {};
            android.msg = packet.android;
            android.target = parseInt(packet.target_android);
            android.arrive = parseInt(packet.arrive_android);
            android.arrivalRate = android.target != 0 ? android.arrive / android.target : 0;
            delete packet.android;
            delete packet.target_android;
            delete packet.arrive_android;
            packet.android = android;

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