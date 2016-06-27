module.exports = TopicOnline;

function filterTopic(topic, filterArray) {
    if (!filterArray || !topic) {
        return false;
    }
    for (var i = 0; i < filterArray.length; i++) {
        if (topic.startsWith(filterArray[i])) {
            return true;
        }
    }
    return false;
}

function TopicOnline(redis, io, id, filterTopics) {
    if (!(this instanceof TopicOnline)) return new TopicOnline(redis, io, id, filterTopics);
    this.redis = redis;
    this.io = io;
    this.id = id;
    this.filters = filterTopics;
    this.interval = 10000;
    this.timeValidWithIn = 20000;
    this.expire = 3600 * 24;
    var self = this;
    setInterval(function () {
        if (self.io.nsps) {
            var result = self.io.nsps['/'].adapter.rooms;
            self.writeTopicOnline(result);
        }
    }, this.interval);
}

TopicOnline.prototype.writeTopicOnline = function (data) {
    for (var key in data) {
        if (data[key].length > 0 && filterTopic(key, this.filters)) {
            var json = {length: data[key].length, time: Date.now()};
            var redisKey = "stats#topicOnline#" + key;
            this.redis.hset(redisKey, this.id, JSON.stringify(json));
            this.redis.expire(redisKey, this.expire);
        }
    }
}

TopicOnline.prototype.getTopicOnline = function (topic, callback) {
    var count = 0;
    var self = this;
    this.redis.hgetall("stats#topicOnline#" + topic, function (err, result) {
        if (result) {
            var delKey = [];
            for (var key in result) {
                var data = JSON.parse(result[key]);
                if ((data.time + self.timeValidWithIn) < Date.now()) {
                    delKey.push(key);
                } else {
                    count = count + data.length;
                }
            }
            ;
            if (delKey.length > 0) {
                self.redis.hdel("stats#topicOnline#" + topic, delKey);
            }
        }
        callback(count);
    });
}