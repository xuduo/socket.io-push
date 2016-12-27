module.exports = (redis, pid, commitThreshHold, packetDropThreshold)=> {
    return new Stats(redis, pid, commitThreshHold, packetDropThreshold);
};

const logger = require('winston-proxy')('Stats');
const randomstring = require("randomstring");
const async = require('async');
const mSecPerHour = 60 * 60 * 1000;

class Stats {

    constructor(redis, pid, redisIncreBuffer, packetDropThreshold = 0) {
        this.redis = redis;
        this.sessionCount = {total: 0};
        this.redisIncrBuffer = redisIncreBuffer;
        this.packetDrop = 0;
        this.packetDropThreshold = packetDropThreshold;
        this.ms = require('./moving-sum.js')();
        const ipPath = process.cwd() + "/ip";
        const fs = require('fs');
        let ip;
        if (fs.existsSync(ipPath)) {
            ip = fs.readFileSync(ipPath, "utf8").trim() + ":" + pid;
        }
        logger.debug("ip file %s %s", ipPath, ip);
        this.id = ip || randomstring.generate(32);
        if (pid > 0) {
            setInterval(() => {
                this.writeStatsToRedis();
            }, 10000);
        }
    }

    writeStatsToRedis(callback) {
        const packetAverage = this.ms.sum([10 * 1000]);
        this.packetAverage1 = packetAverage[0];
        if (!callback) {
            callback = () => {
            };
        }
        this.redis.hset("stats#sessionCount", this.id, JSON.stringify({
            timestamp: Date.now(),
            sessionCount: this.sessionCount,
            packetAverage1: this.packetAverage1,
            packetDrop: this.packetDrop,
            packetDropThreshold: this.packetDropThreshold
        }), callback);
    }

    shouldDrop() {
        if (this.packetDropThreshold != 0 && this.packetAverage1 && this.packetAverage1 > this.packetDropThreshold) {
            logger.debug('threshold exceeded dropping packet %d > %d', this.packetAverage1, this.packetDropThreshold);
            this.packetDrop++;
            return true;
        } else {
            return false;
        }
    }

    addPlatformSession(platform, count) {
        if (!count) {
            count = 1;
        }
        this.changePlatformCount(platform, count);
    }

    removePlatformSession(platform, count) {
        if (!count) {
            count = 1;
        }
        this.changePlatformCount(platform, count * -1);
    }

    changePlatformCount(platform, count) {
        if (platform) {
            if (!this.sessionCount[platform]) {
                this.sessionCount[platform] = 0;
            }
            this.sessionCount[platform] += count;
        }
    }

    onPacket() {
        const timestamp = Date.now();
        this.packetAverage1++;
        this.ms.push(timestamp);
        this.incr("stats#toClientPacket#totalCount", timestamp);
    }

    addPushTotal(count, type) {
        const timestamp = Date.now();
        this.incrby("stats#" + type + "Push#totalCount", timestamp, count);
    }

    addPushSuccess(count, type) {
        const timestamp = Date.now();
        this.incrby("stats#" + type + "Push#successCount", timestamp, count);
    }

    addPushError(count, errorCode, type) {
        const timestamp = Date.now();
        this.incrby("stats#" + type + "PushError" + errorCode + "#totalCount", timestamp, count);
    }

    addSession(socket, count) {
        if (!count) {
            count = 1;
        }
        this.sessionCount.total += count;
        socket.on('stats', (data) => {
            logger.debug("on stats %j", data.requestStats);
            const timestamp = Date.now();
            const totalCount = 0;
            if (data.requestStats && data.requestStats.length) {
                for (let i = 0; i < data.requestStats.length; i++) {
                    const requestStat = data.requestStats[i];
                    this.incrby("stats#request#" + requestStat.path + "#totalCount", timestamp, requestStat.totalCount);
                    this.incrby("stats#request#" + requestStat.path + "#successCount", timestamp, requestStat.successCount);
                    this.incrby("stats#request#" + requestStat.path + "#totalLatency", timestamp, requestStat.totalLatency);
                }
            }
        });
    }

    removeSession(count) {
        if (!count) {
            count = 1;
        }
        this.sessionCount.total -= count;
    }

    strip(timestamp, interval = mSecPerHour) {
        return Math.floor(timestamp / interval) * interval;
    }

    incr(key, timestamp) {
        const hourKey = this.strip(timestamp);
        key = key + "#" + hourKey;
        this.redisIncrBuffer.incrby(key, 1);
    }

    set(key, value, timestamp, interval) {
        const hourKey = this.strip(timestamp, interval);
        key = key + "#" + hourKey;
        this.redisIncrBuffer.set(key, value);
    }

    incrby(key, timestamp, by) {
        if (by > 0) {
            const hourKey = this.strip(timestamp);
            key = key + "#" + hourKey;
            this.redisIncrBuffer.incrby(key, by);
        }
    }

    onNotificationReply(timestamp) {
        const latency = Date.now() - timestamp;
        logger.debug('onNotificationReply %s', latency);
        if (latency < 10000) {
            this.incr("stats#notification#totalCount", timestamp);
            this.incrby("stats#notification#totalLatency", timestamp, latency);
            logger.debug("onNotificationReply %d", latency);
        }
    }

    getSessionCount(callback) {
        this.redis.hgetall('stats#sessionCount', (err, results) => {
            const onlineKeys = ["total", "ios", "android", "pc", "browser"];
            const currentTimestamp = Date.now();
            const processCount = [];
            let packetAverage1 = 0;
            let packetDrop = 0;
            let packetDropThreshold = 0;
            const result = {};
            for (const id in results) {
                const data = JSON.parse(results[id]);
                if ((currentTimestamp - data.timestamp) < 60 * 1000) {
                    onlineKeys.forEach((key) => {
                        if (data.sessionCount[key]) {
                            if (!result[key]) {
                                result[key] = 0;
                            }
                            result[key] += data.sessionCount[key];
                        }
                    });
                    packetAverage1 += data.packetAverage1 || 0;
                    packetDrop += data.packetDrop || 0;
                    packetDropThreshold += data.packetDropThreshold || 0;
                    processCount.push({
                        id: id,
                        count: data.sessionCount,
                        packetAverage1: data.packetAverage1,
                        packetDrop: data.packetDrop,
                        packetDropThreshold: data.packetDropThreshold
                    });
                }
            }
            result.packetAverage1 = packetAverage1;
            result.packetDrop = packetDrop;
            result.processCount = processCount.sort((a, b) => {
                if (a.id < b.id) return -1;
                if (a.id > b.id) return 1;
                return 0;
            });

            callback(result);
        });
    };

    getQueryDataKeys(callback) {
        this.redis.hkeys("queryDataKeys", (err, replies) => {
            const strs = [];
            replies.forEach((buffer) => {
                strs.push(buffer);
            });
            callback(strs.sort(this.sortString));
        });
    }

    sortString(a, b) {
        a = a.toLowerCase();
        b = b.toLowerCase();
        if (a < b) return 1;
        if (a > b) return -1;
        return 0;
    }

    find(key, callback) {
        let interval = mSecPerHour;
        if (key.indexOf("base_") > -1) {
            interval = 60 * 10 * 1000;
        }
        let totalHour = 7 * 24 * 3600 * 1000 / interval;
        if (totalHour > 1500) {
            totalHour = 1500;
        }
        let timestamp = this.strip(Date.now() - (totalHour - 1) * interval);
        const keys = [];
        let totalCount = 0;
        let totalLatency = 0;
        let totalSuccess = 0;
        const timestamps = [];
        for (let i = 0; i < totalHour; i++) {
            timestamps.push(timestamp);
            keys.push("stats#" + key + "#totalCount#" + timestamp);
            keys.push("stats#" + key + "#successCount#" + timestamp);
            keys.push("stats#" + key + "#totalLatency#" + timestamp);
            keys.push("stats#" + key + "#errorCount#" + timestamp);
            timestamp += interval;
        }

        const results = [];
        const redis = this.redis;

        const recursive = (err, replies) => {
            if (replies != -1) {
                results.push(replies);
            }
            if (keys.length > 0) {
                redis.get(keys.shift(), recursive);
            } else {
                const totalChart = [];
                const latencyChart = [];
                const successRateChart = [];
                const countPerSecondChart = [];

                let totalDay = 0;
                let successDay = 0;
                let latencyDay = 0;
                const successRateChartDay = [];
                const latencyChartDay = [];

                for (let i = 0; i < results.length / 4; i++) {

                    const total = parseInt(results[i * 4 + 0]) || 0;
                    let success = parseInt(results[i * 4 + 1]) || 0;
                    const latency = parseInt(results[i * 4 + 2]) || 0;
                    const error = parseInt(results[i * 4 + 3]) || 0;
                    if (success == 0) {
                        success = total - error;
                    }
                    totalCount += total;
                    totalDay += total;
                    totalSuccess += success;
                    successDay += success;
                    totalLatency += latency;
                    latencyDay += latency;
                    totalChart.push(total);
                    latencyChart.push(Math.round(latency / success) || 0);
                    successRateChart.push(((100 * success / total) || 0).toFixed(3));
                    countPerSecondChart.push(total / interval * 1000);

                    if ((i + 1) % (24) == 0) {
                        successRateChartDay.push(((100 * successDay / totalDay) || 0).toFixed(3));
                        latencyChartDay.push(Math.round(latencyDay / successDay) || 0);
                        totalDay = 0;
                        successDay = 0;
                        latencyDay = 0;
                    }

                }
                const avgLatency = Math.round(totalLatency / totalSuccess) || 0;
                const successRate = totalSuccess / totalCount;
                const countPerSecond = totalCount / totalHour / interval * 1000;

                const chartData = {
                    timestamps: timestamps,
                    total: totalChart,
                    latency: latencyChart,
                    successRate: successRateChart,
                    countPerSecond: countPerSecondChart,
                    successRateDay: successRateChartDay,
                    latencyDay: latencyChartDay
                };

                callback({
                    "totalCount": totalCount,
                    "totalSuccess": totalSuccess,
                    "avgLatency": avgLatency,
                    "successRate": successRate,
                    "countPerSecond": countPerSecond,
                    "chartData": chartData
                });
            }
        };

        recursive(null, -1);
    }
}
