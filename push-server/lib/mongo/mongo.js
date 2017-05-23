module.exports = (prefix, url) => {
  return new Mongo(prefix, url);
};

let mongoose = require('mongoose');
mongoose.Promise = Promise;

class Mongo {

  constructor(prefix = '', urls) {
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
      token: String,
      package_name: String
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
    this.deviceConnection.model(prefix + '_device', deviceSchema);
    this.device = this.deviceConnection.model(prefix + '_device');

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
    this.tagConnection.model(prefix + '_tag', tagSchema);
    this.tag = this.tagConnection.model(prefix + '_tag');

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
    this.ttlConnection.model(prefix + '_ttl', ttlSchema);
    this.ttl = this.ttlConnection.model(prefix + '_ttl');

    this.statsConnection = mongoose.createConnection(urls.stats || urls.default);
    const arrivalSchema = mongoose.Schema({
      _id: {
        type: String
      },
      expireAt: {
        type: Date
      },
      timeStart: {
        type: Date,
        index: true
      },
      notification: String,
      android_click: Number,
      target_android: Number,
      arrive_android: Number,
      apn_click: Number,
      target_apn: Number,
      arrive_apn: Number,
      huawei_click: Number,
      target_huawei: Number,
      arrive_huawei: Number,
      xiaomi_click: Number,
      xiaomi_msg_id: String,
      umeng_click: Number,
      umeng_task_id: String,
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
    this.statsConnection.model(prefix + '_arrival', arrivalSchema);
    this.arrival = this.statsConnection.model(prefix + '_arrival');

    const topicOnlineSchema = mongoose.Schema({
      _id: {
        serverId: String,
        topic: String
      },
      expireAt: Date,
      count: Number,
      devices: [{
        pushId: String,
        uid: String,
        platform: String
      }]
    });
    topicOnlineSchema.index({
      '_id.topic': 1
    });
    topicOnlineSchema.index({
      "expireAt": 1
    }, {
      expireAfterSeconds: 0
    });
    this.statsConnection.model(prefix + '_topic_online', topicOnlineSchema);
    this.topicOnline = this.statsConnection.model(prefix + '_topic_online');

    const sessionSchema = mongoose.Schema({
      _id: String,
      expireAt: Date,
      sessionCount: {
        total: Number,
        ios: Number,
        android: Number,
        browser: Number
      },
      packetAverage10s: Number,
      packetDrop: Number,
      packetDropThreshold: Number
    });
    sessionSchema.index({
      "expireAt": 1
    }, {
      expireAfterSeconds: 0
    });
    this.statsConnection.model(prefix + '_session', sessionSchema);
    this.session = this.statsConnection.model(prefix + '_session');

    const statSchema = mongoose.Schema({
      _id: {
        timestamp: Date,
        key: String
      },
      expireAt: Date,
      totalCount: Number,
      successCount: Number,
      totalLatency: Number,
      errorCount: Number
    });

    statSchema.index({
      "expireAt": 1
    }, {
      expireAfterSeconds: 0
    });

    statSchema.index({
      '_id.timestamp': 1
    });

    statSchema.index({
      '_id.key': 1
    });

    this.statsConnection.model(prefix + '_stat', statSchema);
    this.stat = this.statsConnection.model(prefix + '_stat');

  }

  close() {
    this.deviceConnection.close();
    this.ttlConnection.close();
    this.tagConnection.close();
    this.statsConnection.close();
  }

}
