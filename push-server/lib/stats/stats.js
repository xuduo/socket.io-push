module.exports = Stats;

const logger = require('winston-proxy')('Stats');
const randomstring = require("randomstring");

function Stats(redis, port, commitThreshHold) {
    if (!(this instanceof Stats)) return new Stats(redis, port, commitThreshHold);
    this.redis = redis;
    this.sessionCount = {total: 0};
    this.redisIncrBuffer = require('./redisIncrBuffer.js')(redis, commitThreshHold);
    this.packetDrop = 0;
    this.packetDropThreshold = 0;
    this.ms = new (require('./moving-sum.js'))();
    const ipPath = process.cwd() + "/ip";
    const fs = require('fs');
    let ip;
    if (fs.existsSync(ipPath)) {
        ip = fs.readFileSync(ipPath, "utf8").trim() + ":" + port;
    }
    logger.debug("ip file %s %s", ipPath, ip);
    this.id = ip || randomstring.generate(32);
    const self = this;
    if (port > 0) {
        setInterval(function () {
            self.writeStatsToRedis();
        }, 10000);
    }
}

Stats.prototype.writeStatsToRedis = function () {
    const self = this;
    const packetAverage = this.ms.sum([10 * 1000]);
    this.packetAverage1 = packetAverage[0];
    this.redis.hset("stats#sessionCount", self.id, JSON.stringify({
        timestamp: Date.now(),
        sessionCount: self.sessionCount,
        packetAverage1: self.packetAverage1,
        packetDrop: self.packetDrop,
        packetDropThreshold: self.packetDropThreshold
    }));
}

Stats.prototype.shouldDrop = function () {
    if (this.packetDropThreshold != 0 && this.packetAverage1 && this.packetAverage1 > this.packetDropThreshold) {
        logger.debug('threshold exceeded dropping packet %d > %d', this.packetAverage1, this.packetDropThreshold);
        this.packetDrop++;
        return true;
    } else {
        return false;
    }
}

Stats.prototype.addPlatformSession = function (platform, count) {
    if (!count) {
        count = 1;
    }
    this.changePlatformCount(platform, count);
}

Stats.prototype.removePlatformSession = function (platform, count) {
    if (!count) {
        count = 1;
    }
    this.changePlatformCount(platform, count * -1);
}

Stats.prototype.changePlatformCount = function (platform, count) {
    if (platform) {
        if (!this.sessionCount[platform]) {
            this.sessionCount[platform] = 0;
        }
        this.sessionCount[platform] += count;
    }
}

Stats.prototype.onPacket = function () {
    const timestamp = Date.now();
    this.packetAverage1++;
    this.ms.push(timestamp);
    this.incr("stats#toClientPacket#totalCount", timestamp);
}

Stats.prototype.addPushTotal = function (count, type) {
    const timestamp = Date.now();
    this.incrby("stats#" + type + "Push#totalCount", timestamp, count);
}

Stats.prototype.addPushSuccess = function (count, type) {
    const timestamp = Date.now();
    this.incrby("stats#" + type + "Push#successCount", timestamp, count);
}

Stats.prototype.addPushError = function (count, errorCode, type) {
    const timestamp = Date.now();
    this.incrby("stats#" + type + "PushError" + errorCode + "#totalCount", timestamp, count);
}

Stats.prototype.addSession = function (socket, count) {
    if (!count) {
        count = 1;
    }
    this.sessionCount.total += count;

    const self = this;

    socket.on('stats', function (data) {
        logger.debug("on stats %j", data.requestStats);
        const timestamp = Date.now();
        const totalCount = 0;
        if (data.requestStats && data.requestStats.length) {
            for (let i = 0; i < data.requestStats.length; i++) {
                const requestStat = data.requestStats[i];
                self.incrby("stats#request#" + requestStat.path + "#totalCount", timestamp, requestStat.totalCount);
                self.incrby("stats#request#" + requestStat.path + "#successCount", timestamp, requestStat.successCount);
                self.incrby("stats#request#" + requestStat.path + "#totalLatency", timestamp, requestStat.totalLatency);
            }
        }
    });
};

Stats.prototype.removeSession = function (count) {
    if (!count) {
        count = 1;
    }
    this.sessionCount.total -= count;
};

const mSecPerHour = 60 * 60 * 1000;

function strip(timestamp, interval = mSecPerHour) {
    return Math.floor(timestamp / interval) * interval;
}

Stats.prototype.incr = function (key, timestamp) {
    const hourKey = strip(timestamp);
    key = key + "#" + hourKey;
    this.redisIncrBuffer.incrby(key, 1);
};

Stats.prototype.set = function (key, value, timestamp, interval) {
    const hourKey = strip(timestamp, interval);
    key = key + "#" + hourKey;
    this.redisIncrBuffer.set(key, value);
};

Stats.prototype.incrby = function (key, timestamp, by) {
    if (by > 0) {
        const hourKey = strip(timestamp);
        key = key + "#" + hourKey;
        this.redisIncrBuffer.incrby(key, by);
    }
};

Stats.prototype.onNotificationReply = function (timestamp) {
    const latency = Date.now() - timestamp;
    logger.debug('onNotificationReply %s', latency);
    if (latency < 10000) {
        this.incr("stats#notification#totalCount", timestamp);
        this.incrby("stats#notification#totalLatency", timestamp, latency);
        logger.debug("onNotificationReply %d", latency);
    }
};

Stats.prototype.getSessionCount = function (callback) {
    this.redis.hgetall('stats#sessionCount', function (err, results) {
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
                onlineKeys.forEach(function (key) {
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
        result.processCount = processCount.sort(function (a, b) {
            if (a.id < b.id) return -1;
            if (a.id > b.id) return 1;
            return 0;
        });

        callback(result);
    });
};

Stats.prototype.getQueryDataKeys = function (callback) {
    this.redis.hkeys("queryDataKeys", function (err, replies) {
        const strs = [];
        replies.forEach(function (buffer) {
            strs.push(buffer);
        });
        callback(strs.sort(sortString));
    });
}

const sortString = function (a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    if (a < b) return 1;
    if (a > b) return -1;
    return 0;
}

Stats.prototype.find = function (key, callback) {
    let interval = mSecPerHour;
    if (key.indexOf("base_") > -1) {
        interval = 60 * 10 * 1000;
    }
    let totalHour = 7 * 24 * 3600 * 1000 / interval;
    if (totalHour > 1500) {
        totalHour = 1500;
    }
    let timestamp = strip(Date.now() - (totalHour - 1) * interval);
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

    const recursive = function (err, replies) {
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

};

Stats.prototype.userLogin = function (pushId, timestamp) {
    const loginfo = {"in": timestamp, "out": 0};
    logger.debug("user login, pushId: ", pushId, "timestamp: ", timestamp);
    this.redis.hhset("connInfo", pushId, JSON.stringify(loginfo));
};

Stats.prototype.userLogout = function (pushId, timestamp) {
    const loginfo = {};
    logger.debug("user logout, pushId: ", pushId, "timestamp: ", timestamp);
    this.redis.hhget("connInfo", pushId, (err, result) => {
        if (!result) {
            loginfo["in"] = 0;
        } else {
            const temp = JSON.parse(result);
            loginfo["in"] = temp["in"];
        }
        loginfo["out"] = timestamp;
        this.redis.hhset("connInfo", pushId, JSON.stringify(loginfo));
    })
};

Stats.prototype.getUserOnlineCount = function (start, end, callback) {
    const stream = this.redis.hhscanStream("connInfo");
    let result = 0;
    stream.on('data', function (resultKeys) {
        for (let i = 0; i < resultKeys.length; i++) {
            if (i % 2 == 1) {
                const timestamp = JSON.parse(resultKeys[i]);
                if (timestamp["in"] < end && (timestamp["out"] == 0 || timestamp["out"] > start )) {
                    result++;
                }
            }
        }
    });
    stream.on('end', function () {
        callback(result);
    });
};

Stats.prototype.addReachSuccess = function (packetId, count) {
    if (count > 0) {
        const key = "stats#reach#" + packetId;
        this.redisIncrBuffer.incrby(key, count);
    }
};

Stats.prototype.addPacketToReachRate = function (packet, start, ttl) {
    packet.reachCount = 0;
    packet.targetBefore = 0;
    packet.targetEnd = 0;
    this.getUserOnlineCount(start, start, (targetNow) => {
        packet.targetBefore = targetNow;
        this.writeReachRateToRedis(packet);
        setTimeout(() => {
            logger.debug("calculate packet reach rate, id: ", packet.id);
            this.redis.get("stats#reach#" + packet.id, (err, count) => {
                this.getUserOnlineCount(start, start + ttl, (target) => {
                    packet.reachCount = count || 0;
                    packet.targetEnd = target || 0;
                    this.writeReachRateToRedis(packet);
                });
            })
        }, ttl + 60000);
    });
};

Stats.prototype.writeReachRateToRedis = function (packet) {
    this.redis.hset("stats#reachStats", packet.id, JSON.stringify(packet));
};

Stats.prototype.getReachRateStatus = function (callback) {
    const stream = this.redis.hscanStream("stats#reachStats");
    let result = {};
    stream.on('data', (resultKeys) => {
        for (let i = 0; i < resultKeys.length; i++) {
            if (i % 2 == 1) {
                result[resultKeys[i - 1]] = JSON.parse(resultKeys[i]);
            }
        }
    });
    stream.on('end', function () {
        callback(result);
    });
};

