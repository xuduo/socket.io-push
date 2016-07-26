module.exports = function (redis, id) {
    return new RedisIntervalLock(redis, id);
}

class RedisIntervalLock {

    constructor(redis, id) {
        this.redis = redis;
        this.id = id;
    }

    setInterval(key, interval, callback) {
        key = "lock#" + key;
        this.tryCall(key, interval, callback);
        return setInterval(() => {
            this.tryCall(key, interval, callback);
        }, interval);
    }

    tryCall(key, interval, callback) {
        this.redis.call("get", key, (err, result)=> {
            if (!err) {
                if (result == this.id) {
                    this.redis.pexpire(key, interval, (err, result)=> {
                        if (result == 1) {
                            callback();
                        } else {
                            this.trySetNxAndCall(key, interval, callback);
                        }
                    });
                } else {
                    this.trySetNxAndCall(key, interval, callback);
                }
            }
        });
    }

    trySetNxAndCall(key, interval, callback) {
        this.redis.set(key, this.id, "nx", "px", interval - 20, (err, result) => {
            if (result == "OK") {
                callback();
                this.redis.del(key);
            }
        });
    }
}
