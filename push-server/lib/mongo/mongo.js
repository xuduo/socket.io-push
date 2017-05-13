module.exports = (url) => {
    return new Mongo(url);
};

let mongoose = require('mongoose');
mongoose.Promise = Promise;

class Mongo {

    constructor(urls) {
        const deviceConnection = mongoose.createConnection(urls.device || urls.default);
        const deviceSchema = mongoose.Schema({
            _id: String,
            uid: {type: String, index: true},
            platform: String,
            updateTime: {type: Date, index: true}
        });
        deviceSchema.index({uid: 1, platform: 1});
        deviceConnection.model('Device', deviceSchema);
        this.device = deviceConnection.model('Device');

        const tagConnection = mongoose.createConnection(urls.tag || urls.default);
        const tagSchema = mongoose.Schema({
            _id: {pushId: String, tag: String}
        });
        tagSchema.index({'_id.tag': 1});
        tagSchema.index({'_id.pushId': 1});
        tagConnection.model('Tag', tagSchema);
        this.tag = tagConnection.model('Tag');

        const ttlConnection = mongoose.createConnection(urls.ttl || urls.default);
        const ttlSchema = mongoose.Schema({
            _id: {type: String},
            packets: {type: [String]},
            expireAt: {type: Date}
        });
        ttlSchema.index({"expireAt": 1}, {expireAfterSeconds: 0});
        ttlConnection.model('TTL', ttlSchema);
        this.ttl = ttlConnection.model('TTL');

        const statsConnection = mongoose.createConnection(urls.stats || urls.default);
        const arrivalSchema = mongoose.Schema({
            _id: {type: String},
            packets: {type: [String]},
            expireAt: {type: Date},
            timeStart: {type: Date, index: true},
            android_click: {type: Number},
            target_android: {type: Number},
            arrive_android: {type: Number},
            apn_click: {type: Number},
            target_apn: {type: Number},
            arrive_apn: {type: Number},
            huawei_click: {type: Number},
            target_huawei: {type: Number},
            arrive_huawei: {type: Number},
            xiaomi_click: {type: Number},
            target_xiaomi: {type: Number},
            arrive_xiaomi: {type: Number},
            xiaomi_msg_id: {type: String},
            type: {type: String, index: true}
        });
        arrivalSchema.index({"expireAt": 1}, {expireAfterSeconds: 0});
        statsConnection.model('Arrival', arrivalSchema);
        this.arrival = statsConnection.model('Arrival');

        const topicOnlineSchema = mongoose.Schema({
            _id: {serverId: String, topic: String},
            expireAt: {type: Date},
            count: {type: Number},
            devices: {type: [String]}
        });
        topicOnlineSchema.index({'_id.topic': 1});
        topicOnlineSchema.index({"expireAt": 1}, {expireAfterSeconds: 0});
        statsConnection.model('TopicOnline', topicOnlineSchema);
        this.topicOnline = statsConnection.model('TopicOnline');
    }

}
