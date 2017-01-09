module.exports = (redis, io, id, filterTopics) => {
    return new TopicOnline(redis, io, id, filterTopics);
};

class TopicOnline {

    constructor(redis, io, id, filterTopics) {
        this.redis = redis;
        this.id = id;
        if (!filterTopics) {
            this.filters = {};
        } else if (filterTopics.isArray) {
            this.filters = {};
            for (const prefix of filterTopics) {
                this.filters[prefix] = "devices";
            }
        } else {
            this.filters = filterTopics;
        }
        this.filters['noti'] = "count";
        this.interval = 10000;
        this.timeValidWithIn = this.interval * 2;
        this.expire = this.interval * 2;
        if (io) {
            this.io = io;
            setInterval(() => {
                if (this.io.nsps) {
                    const result = this.io.nsps['/'].adapter.rooms;
                    this.writeTopicOnline(result);
                }
            }, this.interval);
        }
    }

    filterTopic(topic) {
        if (!topic) {
            return false;
        }
        for (const prefix in this.filters) {
            if (topic.startsWith(prefix)) {
                return this.filters[prefix];
            }
        }
        return false;
    }

    writeTopicOnline(data) {
        for (const key in data) {
            if (data[key].length > 0) {
                const type = this.filterTopic(key);
                if (type) {
                    const json = {length: data[key].length, time: Date.now()};
                    if (type == 'devices') {
                        const devices = [];
                        for (const socketId in data[key].sockets) {
                            const socket = this.io.sockets.connected[socketId];
                            if (socket) {
                                devices.push({pushId: socket.pushId, uid: socket.uid, platform: socket.platform});
                            }
                        }
                        json.devices = devices;
                    }
                    const redisKey = "stats#topicOnline#" + key;
                    this.redis.hset(redisKey, this.id, JSON.stringify(json));
                    this.redis.pexpire(redisKey, this.expire);
                }
            }
        }
    }

    getTopicOnline(topic, callback) {
        let count = 0;
        this.redis.hgetall("stats#topicOnline#" + topic, (err, result) => {
            if (result) {
                const delKey = [];
                for (const key in result) {
                    const data = JSON.parse(result[key]);
                    if ((data.time + this.timeValidWithIn) < Date.now()) {
                        delKey.push(key);
                    } else {
                        count = count + data.length;
                    }
                }
                if (delKey.length > 0) {
                    this.redis.hdel("stats#topicOnline#" + topic, delKey);
                }
            }
            callback(count);
        });
    }

    getTopicDevices(topic, callback) {
        const devices = [];
        this.redis.hgetall("stats#topicOnline#" + topic, (err, result) => {
            const json = {topic: topic};
            if (result) {
                const delKey = [];
                for (const key in result) {
                    const data = JSON.parse(result[key]);
                    if ((data.time + this.timeValidWithIn) < Date.now()) {
                        delKey.push(key);
                    } else if (data.devices) {
                        for (const device of data.devices) {
                            if (device.platform) {
                                let pCount = json[device.platform];
                                if (!pCount) {
                                    pCount = 0;
                                }
                                pCount = pCount + 1;
                                json[device.platform] = pCount;
                            }
                        }
                        Array.prototype.push.apply(devices, data.devices);
                    }
                }
                json.total = devices.length;
                json.devices = devices;
                if (delKey.length > 0) {
                    this.redis.hdel("stats#topicOnline#" + topic, delKey);
                }
            }
            callback(json);
        });
    }

}