module.exports = (stats) => {
    return new OnlineStats(stats);
};
const logger = require('winston-proxy')('OnlineStats');

class OnlineStats {

    constructor(stats) {
        this.stats = stats;
    }

    write(interval, callback) {
        this.stats.getSessionCount((result) => {
            const timestamp = Date.now();
            this.writeRedis(result, "total", timestamp, interval);
            this.writeRedis(result, "android", timestamp, interval);
            this.writeRedis(result, "ios", timestamp, interval);
            this.writeRedis(result, "packetAverage1", timestamp, interval);
            this.writeRedis(result, "pc", timestamp, interval);
            this.writeRedis(result, "browser", timestamp, interval);
            if (callback) {
                callback();
            }
        });
    }

    writeRedis(result, key, timestamp, interval) {
        if (result && result[key]) {
            this.stats.set(`stats#base_${key}#totalCount`, result[key], timestamp, interval);
        }
    }
}