module.exports = topicOnline;

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

function topicOnline(redis, io, id, filterTopics) {
    if (!(this instanceof topicOnline)) return new topicOnline(redis, io, id, filterTopics);
    this.redis = redis;
    this.io = io;
    this.id = id;
    this.filters = filterTopics;
    this.interval = 10000;
    this.timeValidWithIn = 20000;
    var self = this;
    setInterval(function () {
        if (self.io.nsps) {
            var result = self.io.nsps['/'].adapter.rooms;
            for (var key in result) {
                if (result[key].length > 0 && filterTopic(key, self.filters)) {
                    var json = {length: result[key].length, time: Date.now()};
                    self.redis.hset("stats#topicOnline#" + key, self.id, JSON.stringify(json));
                }
            }
        }
    }, this.interval);
}

topicOnline.prototype.writeTopicOnline = function (data) {
    var self = this;
    for (var key in data) {
        if (data[key].length > 0 && filterTopic(key, self.filters)) {
            var json = {length: data[key].length, time: Date.now()};
            self.redis.hset("stats#topicOnline#" + key, self.id, JSON.stringify(json));
        }
    }
}

topicOnline.prototype.getTopicOnline = function (topic, callback) {
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