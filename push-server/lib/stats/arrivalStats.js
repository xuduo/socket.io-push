module.exports = (redis, redisIncreBuffer, topicOnline) => {
    return new ArrivalStats(redis, redisIncreBuffer, topicOnline);
};

const logger = require('winston-proxy')('ArrivalStats');
const async = require('async');

const getPacketSentKey = (topic, msgId) => {
    return 'stats#packetSent#' + topic + '#' + msgId;
};
const getPacketRecvKey = (topic, msgId) => {
    return 'stats#packetRecv#' + topic + '#' + msgId;
};
const getTopicArrivalKey = (topic) => {
    return 'stats#arrival#' + topic;
};
class ArrivalStats {
    constructor(redis, redisIncreBuffer, topicOnline) {
        this.redis = redis;
        this.redisIncrBuffer = redisIncreBuffer;
        this.topicOnline = topicOnline;
        this.recordKeep = 30 * 24 * 3600 * 1000;
    }

    addPacketSent(topic, msgId, incr){
        const key = getPacketSentKey(topic, msgId);
        if(incr > 0){
            this.redis.ttl(key, (err, ttl) => {
                    if(!err && ttl > 0){
                        logger.debug('send packet, topic:%s, packet:%s, count: ', topic, msgId, incr);
                        this.redisIncrBuffer.incrby(key, incr);
                    }
                });
        }
    }
    getPacketSent (topic, msgId, callback){
        this.redis.get(getPacketSentKey(topic, msgId), (err, c) => {
            if(!err){
                callback(c);
            }
        })
    }
    addPacketRecv(topic, msgId, incr){
        const key = getPacketRecvKey(topic, msgId);
        if(incr > 0){
            this.redis.ttl(key, (err, ttl) => {
                if(!err && ttl > 0){
                    logger.debug('recv packet, topic:%s, packet:%s, count: ', topic, msgId, incr);
                    this.redisIncrBuffer.incrby(key, incr);
                }
            });
        }
    }
    getPacketRecv(topic, msgId, callback){
        this.redis.get(getPacketRecvKey(topic, msgId), (err, c) => {
            if(!err){
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
        packet.target = 0;
        packet.arrive = 0;
        packet.arrivalRate = 0;
        this.checkAndClear(topic);
        logger.info('start to stats this packet, topic:%s, packet:%s', topic, msg.id);
        this.redis.hhset(getTopicArrivalKey(topic), packet.id, JSON.stringify(packet));
        this.topicOnline.getTopicOnline(topic, (count) => {
            logger.info('packet(%s) init count:%d', packet.id, count);
            const packetSentKey = getPacketSentKey(topic, msg.id);
            const packetRecvKey = getPacketRecvKey(topic, msg.id);
            this.redis.set(packetSentKey, count);
            this.redis.pexpire(packetSentKey, this.recordKeep);
            this.redis.set(packetRecvKey, 0);
            this.redis.pexpire(packetRecvKey, this.recordKeep);
        })
    }
    checkAndClear(topic) {
        const topicKey = getTopicArrivalKey(topic);
        const stream = this.redis.hhscanStream(topicKey);
        const now = new Date().getTime();
        stream.on('data', (resultKeys) => {
            for(let i = 0; i < resultKeys.length; i ++){
                if(i % 2 == 1){
                    let packet = JSON.parse(resultKeys[i]);
                    const packetValid = new Date(packet.timeValid).getTime();
                    if(now > this.recordKeep + packetValid){
                        logger.info('delete date before 30 days ago, topic:%s, id:%s ', topic, resultKeys[i-1]);
                        this.redis.hhdel(topicKey, resultKeys[i-1]);
                    }else if(now > 60 * 1000 + packetValid){
                        logger.info('write to ' + topicKey + ' to reduce query time');
                        this.getPacketSent(topic, packet.id, (sentCount) => {
                            packet.target = sentCount;
                            this.getPacketRecv(topic, packet.id, (recvCount) => {
                                packet.arrive = recvCount;
                                packet.arrivalRate = recvCount / sentCount;
                                this.redis.hhset(topicKey, packet.id, JSON.stringify(packet));
                            })
                        })
                    }
                }
            }
        })
    }
    getRateStatusByTopic (topic, callback){
        if(!callback){
            callback = topic;
            topic = 'noti';
        }
        const stream = this.redis.hhscanStream(getTopicArrivalKey(topic));
        let result = {};
        stream.on('data', (resultKeys) => {
            for(let i = 0; i < resultKeys.length; i++){
                if(i %2 == 1){
                    let packet = JSON.parse(resultKeys[i]);
                    result[resultKeys[i-1]] = packet;
                }
            }
        });
        stream.on('end', () => {
            async.each(Object.keys(result), (id, asynccb) => {
                if(result[id].target == 0 || result[id].arrive == 0){
                    this.getPacketSent(topic, id, (sentCount) => {
                        result[id].target = sentCount;
                        this.getPacketRecv(topic, id, (recvCount) => {
                            result[id].arrive = recvCount;
                            result[id].arrivalRate = sentCount ? recvCount / sentCount : 0;
                            asynccb();
                        })
                    });
                }else{
                    asynccb();
                }
            }, (err) => {
                if(err){
                    callback(['error happend, check it.']);
                    return ;
                }
                let stats = [];
                for(let i in result){
                    stats.push(result[i]);
                }
                stats.sort((l, r) => {
                    return new Date(l.timeStart) - new Date(r.timeStart);
                });
                callback(stats);
            })
        })
    }

}