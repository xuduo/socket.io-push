module.exports = (redis, redisIncreBuffer, topicOnline) => {
    return new ArrivalStats(redis, redisIncreBuffer, topicOnline);
};

const logger = require('winston-proxy')('ArrivalStats');
const async = require('async');

const getPacketSentKey = (msgId) => {
    return 'stats#packetSent#' + msgId;
};
const getPacketRecvKey = (msgId) => {
    return 'stats#packetRecv#' + msgId;
};
const getPacketInfoKey = (msgId) => {
    return 'stats#packetInfo#' + msgId;
};
const getTopicArrivalKey = (topic) => {
    return 'stats#packetlist#' + topic;
};

class ArrivalStats {
    constructor(redis, redisIncreBuffer, topicOnline) {
        this.redis = redis;
        this.redisIncrBuffer = redisIncreBuffer;
        this.topicOnline = topicOnline;
        this.recordKeepTime = 30 * 24 * 3600 * 1000;
        this.maxrecordKeep = -100;
    }

    addPacketSent(msgId, incr) {
        const key = getPacketSentKey(msgId);
        if (incr > 0) {
            this.redis.ttl(key, (err, ttl) => {
                if (!err && ttl > 0) {
                    logger.debug('send packet, packet:%s, count: ', msgId, incr);
                    this.redisIncrBuffer.incrby(key, incr);
                }
            });
        }
    }

    getPacketSent(msgId, callback) {
        this.redis.get(getPacketSentKey(msgId), (err, c) => {
            if (!err) {
                callback(c);
            }
        })
    }

    addPacketRecv(msgId, incr) {
        const key = getPacketRecvKey(msgId);
        if (incr > 0) {
            this.redis.ttl(key, (err, ttl) => {
                if (!err && ttl > 0) {
                    logger.debug('recv packet, packet:%s, count: ', msgId, incr);
                    this.redisIncrBuffer.incrby(key, incr);
                }
            });
        }
    }

    getPacketRecv(msgId, callback) {
        this.redis.get(getPacketRecvKey(msgId), (err, c) => {
            if (!err) {
                callback(c);
            }
        })
    }

    startToStats(topic, msg, ttl) {
        let packet = {};
        packet.id = msg.id;
        packet.title = msg.android.title;
        packet.message = msg.android.message;
        let now = new Date().getTime();
        packet.timeStart = new Date(now).toLocaleString();
        packet.timeValid = new Date(now + ttl).toLocaleString();
        logger.info('start to stats this packet, topic:%s, packet:%s', topic, msg.id);
        this.redis.rpush(getTopicArrivalKey(topic), msg.id);
        this.redis.set(getPacketInfoKey(msg.id), JSON.stringify(packet));
        this.redis.pexpire(getPacketInfoKey(msg.id), this.recordKeepTime);
        if (topic != 'group') {
            this.topicOnline.getTopicOnline(topic, (count) => {
                logger.info('packet(%s) init count:%d', packet.id, count);
                const packetSentKey = getPacketSentKey(msg.id);
                const packetRecvKey = getPacketRecvKey(msg.id);
                this.redis.set(packetSentKey, count);
                this.redis.pexpire(packetSentKey, this.recordKeepTime);
                this.redis.set(packetRecvKey, 0);
                this.redis.pexpire(packetRecvKey, this.recordKeepTime);
            })
        } else { //单播,比较麻烦
            this.redis.ltrim(getTopicArrivalKey(topic), this.maxrecordKeep, -1);
            //@todo
        }
    }

    getRateStatusByTopic(topic, callback) {
        let result = [];
        this.redis.lrange(getTopicArrivalKey(topic), 0, -1, (err, data) => {
            async.each(data, (packetId, asynccb) => {
                this.redis.get(getPacketInfoKey(packetId), (err, strPacket) => {
                    if (strPacket) {
                        let packet = JSON.parse(strPacket);
                        this.getPacketSent(packet.id, (sentCount) => {
                            packet.target = sentCount;
                            this.getPacketRecv(packet.id, (recvCount) => {
                                packet.arrive = recvCount;
                                packet.arrivalRate = sentCount != 0 ? recvCount / sentCount : 0;
                                result.push(packet);
                                asynccb();
                            })
                        })
                    }
                })
            }, (err) => {
                if (err) {
                    callback('error happend', result);
                } else {
                    callback(null, result);
                }
            });
        });
    }

}