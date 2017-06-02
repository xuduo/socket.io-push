module.exports = (prefix, url) => {
  return new Mongo(prefix, url);
};

let mongoose = require('mongoose');
mongoose.Promise = Promise;

class Mongo {

  constructor(prefix = '', urls) {
    this.urls = urls;
    this.prefix = prefix;

    const deviceSchema = mongoose.Schema({
      _id: String,
      uid: {
        type: String,
        index: true
      },
      platform: String,
      socketId: String,
      tags: {
        type: [String],
        index: true
      },
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
    this.device = this.getModel('device', deviceSchema);

    this.ttlConnection = mongoose.createConnection(urls.ttl || urls.default);
    const ttlSchema = mongoose.Schema({
      _id: {
        type: String
      },
      packetsMixed: {
        type: [mongoose.Schema.Types.Mixed]
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
    this.ttl = this.getModel('ttl', ttlSchema);

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
      ttl: Number,
      click_android: Number,
      target_android: Number,
      arrive_android: Number,
      arrive_umeng: Number,
      click_apn: Number,
      target_apn: Number,
      arrive_apn: Number,
      click_huawei: Number,
      target_huawei: Number,
      arrive_huawei: Number,
      click_xiaomi: Number,
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
    this.arrival = this.getModel('arrival', arrivalSchema);

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
    this.topicOnline = this.getModel('topic_online', topicOnlineSchema);

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

    this.session = this.getModel('session', sessionSchema);

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

    this.stat = this.getModel('stat', statSchema);

  }

  getModel(path, schema) {
    if (!this.connections) {
      this.connections = {};
      if (this.urls.default) {
        this.connections[this.urls.default] = mongoose.createConnection(this.urls.default);
      }
    }
    const url = this.urls[path] || this.urls.default;
    if (!this.connections[url]) {
      this.connections[url] = mongoose.createConnection(url);
    }
    const conenction = this.connections[url];
    return conenction.model(this.prefix + '_' + path, schema);
  }

  close() {
    for (const key in this.connections) {
      this.connections[key].close();
    }
  }

}
