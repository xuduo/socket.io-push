module.exports = (redis, io, id, filterTopics) => {
    return new TopicOnline(redis, io, id, filterTopics);
};

class TopicOnline {

    constructor(redis, io, id, filterTopics) {
        this.redis = redis;
        this.id = id;
        this.filters = filterTopics;
        this.interval = 10000;
        this.timeValidWithIn = 20000;
        this.expire = 3600 * 24;
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

    filterTopic(topic, filterArray) {
        if (!filterArray || !topic) {
            return false;
        }
        for (let i = 0; i < filterArray.length; i++) {
            if (topic.startsWith(filterArray[i])) {
                return true;
            }
        }
        return false;
    }

    writeTopicOnline(data) {
        for (const key in data) {
            if (data[key].length > 0 && this.filterTopic(key, this.filters)) {
                const devices = [];
                for (const socketId in data[key].sockets) {
                    const socket = this.io.sockets.connected[socketId];
                    if (socket) {
                        devices.push({pushId: socket.pushId, uid: socket.uid, platform: socket.platform});
                    }
                }
                const json = {length: data[key].length, devices: devices, time: Date.now()};
                const redisKey = "stats#topicOnline#" + key;
                this.redis.hset(redisKey, this.id, JSON.stringify(json));
                this.redis.expire(redisKey, this.expire);
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
                    } else {
                        for(const device of data.devices){
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