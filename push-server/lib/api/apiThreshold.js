module.exports = ApiThreshold;
const logger = require('../log/index.js')('ApiThreshold');

function ApiThreshold(redis) {
    if (!(this instanceof ApiThreshold)) return new ApiThreshold(redis);
    this.watchedTopics = [];
    this.redis = redis;
}

ApiThreshold.prototype.checkPushDrop = function (topic, callback) {
    let call = true;
    const threshold = this.watchedTopics[topic];
    if (threshold) {
        const redis = this.redis;
        redis.lindex("apiThreshold#callTimestamp#" + topic, -1, function (err, result) {
            if (result && result > (Date.now() - 10 * 1000)) {
                logger.info("too many call dropping %s", topic);
                call = false;
            }
            doPush(redis, topic, call, threshold, callback);
        });
    } else {
        doPush(this.redis, topic, call, threshold, callback);
    }
}

ApiThreshold.prototype.setThreshold = function (topic, threshold) {
    if (threshold == 0) {
        delete this.watchedTopics[topic];
        logger.info("remove ApiThreshold %s %s", topic, threshold);
    } else {
        const fakeValues = [];
        const fakeTime = Date.now() - 20 * 1000;
        for (let i = 0; i < threshold; i++) {
            fakeValues.push(fakeTime);
        }
        const key = "apiThreshold#callTimestamp#" + topic;
        this.redis.lpush(key, fakeValues);
        this.redis.ltrim(key, 0, threshold - 1);
        this.watchedTopics[topic] = threshold;
        logger.info("set ApiThreshold %s %s", topic, threshold);
    }
}


function doPush(redis, topic, call, threshold, callback) {
    if (call && threshold) {
        const key = "apiThreshold#callTimestamp#" + topic;
        redis.lpush(key, Date.now());
        redis.ltrim(key, 0, threshold - 1);
    }
    callback(call);
}