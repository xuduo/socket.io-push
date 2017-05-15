module.exports = (url) => {
  return new Mongo(url);
};

let mongoose = require('mongoose');
mongoose.Promise = Promise;

class Mongo {

  constructor(urls) {
    this.deviceConnection = mongoose.createConnection(urls.device || urls.default);
    const deviceSchema = mongoose.Schema({
      _id: String,
      uid: {
        type: String,
        index: true
      },
      platform: String,
      socketId: String,
      updateTime: {
        type: Date,
        index: true
      },
      type: {
        type: String,
        index: true
      },
      token: {
        type: String
      },
      package_name: {
        type: String
      }
    });
    deviceSchema.index({
      uid: 1,
      platform: 1
    });
    deviceSchema.index({
      _id: 1,
      type: 1
    });
    deviceSchema.index({
      package_name: 1,
      type: 1
    });
    deviceSchema.index({
      token: 1,
      package_name: 1,
      type: 1
    });
    this.deviceConnection.model('Device', deviceSchema);
    this.device = this.deviceConnection.model('Device');

    this.tagConnection = mongoose.createConnection(urls.tag || urls.default);
    const tagSchema = mongoose.Schema({
      _id: {
        pushId: String,
        tag: String
      }
    });
    tagSchema.index({
      '_id.tag': 1
    });
    tagSchema.index({
      '_id.pushId': 1
    });
    this.tagConnection.model('Tag', tagSchema);
    this.tag = this.tagConnection.model('Tag');

    this.ttlConnection = mongoose.createConnection(urls.ttl || urls.default);
    const ttlSchema = mongoose.Schema({
      _id: {
        type: String
      },
      packets: {
        type: [String]
      },
      expireAt: {
        type: Date
      }
    });
    ttlSchema.index({
      "expireAt": 1
    }, {
      expireAfterSeconds: 0
    });
    this.ttlConnection.model('TTL', ttlSchema);
    this.ttl = this.ttlConnection.model('TTL');

    this.statsConnection = mongoose.createConnection(urls.stats || urls.default);
    const arrivalSchema = mongoose.Schema({
      _id: {
        type: String
      },
      packets: {
        type: [String]
      },
      expireAt: {
        type: Date
      },
      timeStart: {
        type: Date,
        index: true
      },
      android_click: {
        type: Number
      },
      target_android: {
        type: Number
      },
      arrive_android: {
        type: Number
      },
      apn_click: {
        type: Number
      },
      target_apn: {
        type: Number
      },
      arrive_apn: {
        type: Number
      },
      huawei_click: {
        type: Number
      },
      target_huawei: {
        type: Number
      },
      arrive_huawei: {
        type: Number
      },
      xiaomi_click: {
        type: Number
      },
      target_xiaomi: {
        type: Number
      },
      arrive_xiaomi: {
        type: Number
      },
      xiaomi_msg_id: {
        type: String
      },
      type: {
        type: String,
        index: true
      }
    });
    arrivalSchema.index({
      "expireAt": 1
    }, {
      expireAfterSeconds: 0
    });
    this.statsConnection.model('Arrival', arrivalSchema);
    this.arrival = this.statsConnection.model('Arrival');

    const topicOnlineSchema = mongoose.Schema({
      _id: {
        serverId: String,
        topic: String
      },
      expireAt: {
        type: Date
      },
      count: {
        type: Number
      },
      devices: {
        type: [String]
      }
    });
    topicOnlineSchema.index({
      '_id.topic': 1
    });
    topicOnlineSchema.index({
      "expireAt": 1
    }, {
      expireAfterSeconds: 0
    });
    this.statsConnection.model('TopicOnline', topicOnlineSchema);
    this.topicOnline = this.statsConnection.model('TopicOnline');
  }

  close() {
    this.deviceConnection.close();
    this.ttlConnection.close();
    this.tagConnection.close();
    this.statsConnection.close();
  }

}
