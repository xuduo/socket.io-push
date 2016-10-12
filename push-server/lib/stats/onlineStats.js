module.exports = OnlineStats;
const logger = require('winston-proxy')('OnlineStats');
const request = require('request');

function OnlineStats(stats) {
    if (!(this instanceof OnlineStats)) return new OnlineStats(stats);
    this.stats = stats;
}

OnlineStats.prototype.write = function (interval, callback) {
    this.stats.getSessionCount((result) => {
        const timestamp = Date.now();
        this.writeRedis(result, "total", timestamp, interval);
        this.writeRedis(result, "android", timestamp, interval);
        this.writeRedis(result, "ios", timestamp, interval);
        this.writeRedis(result, "packetAverage1", timestamp, interval);
        this.writeRedis(result, "pc", timestamp, interval);
        this.writeRedis(result, "browser", timestamp, interval);
        logger.info("write online stats to redis ", result);
        if (callback) {
            callback();
        }
    });
}

OnlineStats.prototype.writeRedis = function (result, key, timestamp, interval) {
    if (result && result[key]) {
        this.stats.set(`stats#base_${key}#totalCount`, result[key], timestamp, interval);
    }
}