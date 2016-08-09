module.exports = OnlineStats;

const request = require('request');

function OnlineStats(stats, port) {
    if (!(this instanceof OnlineStats)) return new OnlineStats(stats, port);
    this.interval = 10 * 60 * 1000;
    this.port = port;
    this.stats = stats;
    this.writeStats();
    setInterval(()=> {
        this.writeStats();
    }, this.interval);
}

OnlineStats.prototype.writeStats = function () {
    request({
            url: `http://127.0.0.1:${this.port}/api/stats/base`
        }, (error, response, body) => {
            if (!error && body) {
                try {
                    const result = JSON.parse(body);
                    const timestamp = Date.now();
                    this.writeRedis(result, "total", timestamp);
                    this.writeRedis(result, "android", timestamp);
                    this.writeRedis(result, "ios", timestamp);
                    this.writeRedis(result, "packetAverage1", timestamp);
                    this.writeRedis(result, "pc", timestamp);
                    this.writeRedis(result, "browser", timestamp);
                } catch (err) {
                }
            }
        }
    );
}

OnlineStats.prototype.writeRedis = function (result, key, timestamp) {
    if (result && result[key]) {
        this.stats.set(`stats#base_${key}#totalCount`, result[key], timestamp, this.interval);
    }
}