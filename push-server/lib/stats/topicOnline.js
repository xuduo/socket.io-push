module.exports = (mongo, io, id, filterTopics) => {
    return new TopicOnline(mongo, io, id, filterTopics);
};
const logger = require('winston-proxy')('TopicOnline');

class TopicOnline {

    constructor(mongo, io, id, filterTopics) {
        this.mongo = mongo;
        this.id = id;
        if (!filterTopics) {
            this.filters = {};
        } else if (filterTopics.isArray) {
            this.filters = {};
            for (const prefix of filterTopics) {
                this.filters[prefix] = "count";
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
        const expireAt = Date.now() + this.timeValidWithIn;
        for (const key in data) {
            if (data[key].length > 0) {
                const type = this.filterTopic(key);
                if (type) {
                    const json = {count: data[key].length, expireAt};
                    if (type == 'devices') {
                        json.devices = [];
                        for (const socketId in data[key].sockets) {
                            const socket = this.io.sockets.connected[socketId];
                            if (socket) {
                                data.devices.push({pushId: socket.pushId, uid: socket.uid, platform: socket.platform});
                            }
                        }
                    }
                    this.mongo.topicOnline.update(
                        {_id: {serverId: this.id, topic: key}},
                        json,
                        {upsert: true}, (err, doc) => {
                            logger.debug('topicOnline.update ', err, json, doc);
                        });
                }
            }
        }
    }

    getTopicOnline(topic, callback) {
        let count = 0;
        this.mongo.topicOnline.find({'_id.topic': topic}).select('-devices').exec((err, docs) => {
            if (!err && docs) {
                for (const doc of docs) {
                    if (doc.expireAt.getTime() > Date.now()) {
                        count = count + doc.count;
                        logger.debug('topicOnline.find ', doc, new Date(), count);
                    }
                }
            }
            callback(count);
        });
    }

    getTopicDevices(topic, callback) {
        const json = {topic: topic, devices: [], total: 0};
        this.mongo.topicOnline.find({'_id.topic': topic}, (err, docs) => {
            if (!err && docs) {
                for (const doc of docs) {
                    if (doc.expireAt.getTime() > Date.now()) {
                        for (const device of doc.devices) {
                            json.devices.push(device);
                        }
                    }
                    json.total = json.devices.length;
                }
            }
            callback(json);
        });
    }

}