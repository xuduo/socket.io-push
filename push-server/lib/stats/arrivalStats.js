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

    getRateStatusByTopic(topic, callback) {
        const result = [];
        this.redis.lrange(getArrivalListKey(topic), 0, -1, (err, data) => {
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
            packet.arrivalRate = packet.target != 0 ? parseInt(packet.arrive_android) / parseInt(packet.target_android) : 0;
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