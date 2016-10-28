module.exports = (redis) => {
    return new ArrivalStats(redis);
};

const logger = require('winston-proxy')('ArrivalStats');
const async = require('async');

class ArrivalStats {
    constructor(redis) {
        this.redis = redis;
        this.redisIncrBuffer = require('./redisIncrBuffer.js')(redis, 10 * 1000);
    }

    connect(socket) {
        if (socket.platform == 'android') {
            const loginfo = Date.now().toString() + ",0";
            logger.debug("user login, pushId: ", socket.pushId, "loginfo ", loginfo);
            this.redis.hhset("connInfo", socket.pushId, loginfo);
        }
    }

    disconnect(socket) {
        this.redis.hhget("connInfo", socket.pushId, (err, result) => {
            if (result) {
                logger.debug("user logout, pushId: ", socket.pushId, "loginfo: ", result);
                let loginfo = result.toString().split(',');
                loginfo[1] = (Date.now() - parseInt(loginfo[0])).toString();
                this.redis.hhset("connInfo", socket.pushId, loginfo[0] + ',' + loginfo[1]);
            }
        })
    }

    getUserOnlineCount(start, end, callback) {
        const stream = this.redis.hhscanStream("connInfo");
        let result = 0;
        stream.on('data', (resultKeys) => {
            for (let i = 0; i < resultKeys.length; i++) {
                if (i % 2 == 1) {
                    const loginfo = resultKeys[i].toString().split(',');
                    const con = parseInt(loginfo[0]);
                    const discon = parseInt(loginfo[1]);
                    if (con < end && (discon == 0 || discon + con > start )) {
                        result++;
                    }
                    if (discon != 0 && discon + con < Date.now() - 3 * 24 * 3600 * 1000) {
                        this.redis.hhdel("connInfo", resultKeys[i - 1]);
                    }
                }
            }
        });
        stream.on('end', () => {
            callback(result);
        });
    }

    addArrivalSuccess(packetId, count) {
        if (count > 0) {
            const key = "stats#arrival#" + packetId;
            this.redisIncrBuffer.incrby(key, count);
        }
    }

    addPacketToArrivalRate(msg, start, ttl) {
        msg = JSON.parse(JSON.stringify(msg));
        let packet = {};
        packet.id = msg.id;
        packet.title = msg.android.title;
        packet.message = msg.android.message;
        packet.timeStart = new Date(start).toLocaleString();
        packet.timeValid = new Date(msg.timestampValid).toLocaleString();
        packet.ttl = ttl;
        packet.reachCount = 0;
        packet.targetBefore = 0;
        packet.targetEnd = 0;
        this.getUserOnlineCount(start, start, (targetNow) => {
            packet.targetBefore = targetNow;
            this.writeArrivalRateToRedis(packet);
            setTimeout(() => {
                logger.debug("calculate packet reach rate, id: ", packet.id);
                this.getUserOnlineCount(start, start + ttl, (target) => {
                    packet.targetEnd = target || 0;
                    this.writeArrivalRateToRedis(packet);
                });
            }, ttl + 60000);
        });
    }

    writeArrivalRateToRedis(packet) {
        this.redis.hset("stats#arrivalStats", packet.id, JSON.stringify(packet));
    }

    getArrivalRateStatus(callback) {
        const stream = this.redis.hscanStream("stats#arrivalStats");
        let result = {};
        stream.on('data', (resultKeys) => {
            for (let i = 0; i < resultKeys.length; i++) {
                if (i % 2 == 1) {
                    result[resultKeys[i - 1]] = JSON.parse(resultKeys[i]);
                }
            }
        });
        stream.on('end', () => {
            async.each(Object.keys(result), (id, asynccb) => {
                this.redis.get("stats#arrival#" + id, (err, count) => {
                    result[id].reachCount = count || 0;
                    asynccb();
                })
            }, (err) => {
                let stats = [];
                for (let i in result) {
                    stats.push(result[i]);
                }
                stats.sort((stat1, stat2) => {
                    return new Date(stat2.timeStart) - new Date(stat1.timeStart);
                });
                callback(stats);
            });
        });
    }
}