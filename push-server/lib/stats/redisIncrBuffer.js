module.exports = RedisIncrBuffer;

function RedisIncrBuffer(redis, commitThreshHold) {
    if (!(this instanceof RedisIncrBuffer)) return new RedisIncrBuffer(redis, commitThreshHold);
    this.redis = redis;
    this.map = {};
    this.timestamp = Date.now();
    if (commitThreshHold === 0) {
        this.commitThreshold = 0;
    } else {
        this.commitThreshold = commitThreshHold || 20 * 1000;
    }
}

RedisIncrBuffer.prototype.incrby = function (key, by) {
    var currentIncr = this.map[key] || 0;
    this.map[key] = currentIncr + by;
    this.checkCommit();
};

RedisIncrBuffer.prototype.checkCommit = function () {
    var timestamp = Date.now();
    if ((timestamp - this.timestamp) >= this.commitThreshold) {
        for (var key in this.map) {
            this.redis.incrby(key, this.map[key]);
            var index = key.indexOf("#totalCount");
            if (index != -1) {
                var str = key.substring("stats#".length, index);
                this.redis.hset("queryDataKeys", str, Date.now())
            }
        }
        this.map = {};
        this.timestamp = timestamp;
    }
};