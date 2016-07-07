module.exports = TagService;

function TagService(redis) {
    if (!(this instanceof TagService)) return new TagService(redis);
    this.redis = redis;
    this.maxTags = 50;
}

TagService.prototype.addTag = function (pushId, tag) {
    const self = this;
    self.redis.hkeys("pushIdTag#" + pushId, function (err, tags) {
        if ((!tags || tags.length == 0) || (tags.length < self.maxTags && tags.indexOf(tag) == -1)) {
            self.redis.hset("tagPushId#" + tag, pushId, "");
            self.redis.hset("pushIdTag#" + pushId, tag, "");
        }
    });
}

TagService.prototype.removeTag = function (pushId, tag) {
    this.redis.hdel("tagPushId#" + tag, pushId);
    this.redis.hdel("pushIdTag#" + pushId, tag);
}

TagService.prototype.getPushIdsByTag = function (tag, callback) {
    this.redis.hkeys("tagPushId#" + tag, function (err, pushIds) {
        if (pushIds) {
            callback(pushIds);
        }
    });
};

TagService.prototype.getTagsByPushId = function (pushId, callback) {
    this.redis.hkeys("pushIdTag#" + pushId, function (err, tags) {
        if (tags) {
            callback(tags);
        }
    });
};

TagService.prototype.scanPushIdByTag = function (tag, count, callback, endCallback) {
    const stream = this.redis.hscanStream("tagPushId#" + tag, {count: count});

    stream.on('data', function (resultKeys) {
        for (let i = 0; i < resultKeys.length; i++) {
            if (i % 2 == 0) {
                callback(resultKeys[i]);
            }
        }
    });
    stream.on('end', function () {
        endCallback();
    });
};