module.exports = function (redis, commitThreshHold) {
    return new RedisIncrBuffer(redis, commitThreshHold);
};

const expire = 30 * 24 * 60 * 60;

class RedisIncrBuffer {

    constructor(redis, commitThreshHold) {
        this.redis = redis;
        this.map = {};
        this.timestamp = Date.now();
        if (commitThreshHold === 0) {
            this.commitThreshold = 0;
        } else {
            this.commitThreshold = commitThreshHold || 20 * 1000;
        }
    }

    incrby(key, by) {
        const currentIncr = this.map[key] || 0;
        this.map[key] = currentIncr + by;
        this.checkCommit();
    }

    set(key, value) {
        this.redis.set(key, value);
        this.redis.expire(key, expire);
        this.saveQueryDataKeys(key);
    }

    saveQueryDataKeys(key) {
        const index = key.indexOf("#totalCount");
        if (index != -1) {
            const str = key.substring("stats#".length, index);
            this.redis.hset("queryDataKeys", str, Date.now())
        }
    }

    checkCommit() {
        const timestamp = Date.now();
        if ((timestamp - this.timestamp) >= this.commitThreshold) {
            for (const key in this.map) {
                this.redis.incrby(key, this.map[key]);
                this.redis.expire(key, expire);
                this.saveQueryDataKeys(key);
            }
            this.map = {};
            this.timestamp = timestamp;
        }
    }

}