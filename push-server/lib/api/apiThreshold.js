module.exports = (redis, topicThreshold) => {
    return new ApiThreshold(redis, topicThreshold);

};
const logger = require('winston-proxy')('ApiThreshold');

class ApiThreshold {

    constructor(redis, topicThreshold) {
        this.watchedTopics = [];
        this.redis = redis;
        for (let topic in topicThreshold) {
            this.setThreshold(topic, topicThreshold[topic]);
        }
    }

    checkPushDrop(topic, callback) {
        let call = true;
        const threshold = this.watchedTopics[topic];
        if (threshold) {
            this.redis.lindex("apiThreshold#callTimestamp#" + topic, -1, (err, result) => {
                if (result && result > (Date.now() - 10 * 1000)) {
                    logger.info("too many call dropping %s", topic);
                    call = false;
                }
                this.doPush(this.redis, topic, call, threshold, callback);
            });
        } else {
            this.doPush(this.redis, topic, call, threshold, callback);
        }
    }

    setThreshold(topic, threshold) {
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

    doPush(redis, topic, call, threshold, callback) {
        if (call && threshold) {
            const key = "apiThreshold#callTimestamp#" + topic;
            redis.lpush(key, Date.now());
            redis.ltrim(key, 0, threshold - 1);
        }
        callback(call);
    }

}