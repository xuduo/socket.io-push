module.exports = (redis, topicOnline, xiaomiProvider) => {
    return new ArrivalStats(redis, topicOnline, xiaomiProvider);
};

const logger = require('winston-proxy')('ArrivalStats');
const async = require('async');

const getPacketInfoKey = (msgId) => {
    return 'stats#packetInfo#' + msgId;
};
const getTopicArrivalKey = (topic) => {
    return 'stats#packetlist#' + topic;
};

class ArrivalStats {

    constructor(redis, topicOnline, xiaomiProvider) {
        this.redis = redis;
        this.topicOnline = topicOnline;
        this.recordKeepTime = 30 * 24 * 3600 * 1000;
        this.maxrecordKeep = -100;
        this.xiaomiProvider = xiaomiProvider;
    }

    addPacketInfo(msgId, key, incr) {
        const packetInfoKey = getPacketInfoKey(msgId);
        if (incr > 0) {
            this.redis.ttl(packetInfoKey, (err, ttl) => {
                if (!err && ttl > 0) {
                    logger.debug('send packet, packet:%s, count: ', msgId, incr);
                    this.redis.hincrby(packetInfoKey, key, incr);
                }
            });
        }
    }

    setPacketInfo(msgId, key, value) {
        const packetInfoKey = getPacketInfoKey(msgId);
        this.redis.ttl(packetInfoKey, (err, ttl) => {
            if (!err && ttl > 0) {
                logger.debug('setPacketInfo ', msgId, value);
                this.redis.hset(packetInfoKey, key, value);
            }
        });
    }

    startToStats(topic, msg, ttl) {
        logger.info('start to stats this packet, topic:%s, packet:%s', topic, msg.id);
        this.redis.lpush(getTopicArrivalKey(topic), msg.id);

        const packetInfoKey = getPacketInfoKey(msg.id);
        this.redis.hmset(packetInfoKey, 'id', msg.id,
            'title', msg.android.title,
            'message', msg.android.message,
            'timeStart', new Date().getTime(),
            'ttl', ttl);
        this.redis.pexpire(packetInfoKey, this.recordKeepTime);
        if (topic != 'group') {
            this.topicOnline.getTopicOnline(topic, (count) => {
                logger.info('packet(%s) init count:%d', msg.id, count);
                this.redis.hset(packetInfoKey, 'target', count);
                this.redis.hset(packetInfoKey, 'arrive', 0);
            })
        } else { //单播,比较麻烦
            this.redis.ltrim(getTopicArrivalKey(topic), this.maxrecordKeep, -1);
            //@todo
        }
    }

    getRateStatusByTopic(topic, callback) {
        const result = [];
        this.redis.lrange(getTopicArrivalKey(topic), 0, -1, (err, data) => {
            async.each(data, (packetId, asynccb) => {
                const packetInfoKey = getPacketInfoKey(packetId);
                this.redis.hgetall(packetInfoKey, (err, reply) => {
                    if (err) {
                        logger.error('fail to read packet info, key:%s, reaon:%s', packetInfoKey, err);
                        asynccb();
                        return;
                    }
                    const packet = {};
                    logger.debug('reply: %s', JSON.stringify(reply));
                    for (const key in reply) {
                        packet[key] = reply[key];
                    }
                    packet.timeValid = new Date(parseInt(packet.timeStart) + parseInt(packet.ttl)).toLocaleString();
                    packet.timeStart = new Date(parseInt(packet.timeStart)).toLocaleString();
                    packet.arrivalRate = packet.target != 0 ? parseInt(packet.arrive) / parseInt(packet.target) : 0;
                    result.push(packet);
                    if (this.xiaomiProvider) {
                        this.xiaomiProvider.trace(packet, ()=> {
                            asynccb();
                        });
                    } else {
                        asynccb();
                    }
                });
            }, (err) => {
                if (err) logger.error('error: ' + err);
                callback(result);
            });
        });
    }

}