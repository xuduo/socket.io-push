module.exports = (redis) => {
    return new TagService(redis);
};

class TagService {

    constructor(redis) {
        this.redis = redis;
        this.maxTags = 50;
    }

    addTag(pushId, tag) {
        this.redis.hkeys("pushIdTag#" + pushId, (err, tags) => {
            if ((!tags || tags.length == 0) || (tags.length < this.maxTags && tags.indexOf(tag) == -1)) {
                this.redis.hset("tagPushId#" + tag, pushId, "");
                this.redis.hset("pushIdTag#" + pushId, tag, "");
            }
        });
    }

    removeTag(pushId, tag) {
        this.redis.hdel("tagPushId#" + tag, pushId);
        this.redis.hdel("pushIdTag#" + pushId, tag);
    }

    getPushIdsByTag(tag, callback) {
        this.redis.hkeys("tagPushId#" + tag, (err, pushIds) => {
            if (pushIds) {
                callback(pushIds);
            }
        });
    }

    getTagsByPushId(pushId, callback) {
        this.redis.hkeys("pushIdTag#" + pushId, (err, tags) => {
            if (tags) {
                callback(tags);
            }
        });
    }

    scanPushIdByTag(tag, count, callback, endCallback) {
        const stream = this.redis.hscanStream("tagPushId#" + tag, {count: count});

        stream.on('data', (resultKeys) => {
            for (let i = 0; i < resultKeys.length; i++) {
                if (i % 2 == 0) {
                    callback(resultKeys[i]);
                }
            }
        });
        stream.on('end', () => {
            endCallback();
        });
    }
}