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
    const currentIncr = this.map[key] || 0;
    this.map[key] = currentIncr + by;
    this.checkCommit();
};

RedisIncrBuffer.prototype.checkCommit = function () {
    const timestamp = Date.now();
    if ((timestamp - this.timestamp) >= this.commitThreshold) {
        for (const key in this.map) {
            this.redis.incrby(key, this.map[key]);
            const index = key.indexOf("#totalCount");
            if (index != -1) {
                const str = key.substring("stats#".length, index);
                this.redis.hset("queryDataKeys", str, Date.now())
            }
        }
        this.map = {};
        this.timestamp = timestamp;
    }
};