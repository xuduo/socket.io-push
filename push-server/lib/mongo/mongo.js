module.exports = (prefix, url, debug) => {
  return new Mongo(prefix, url, debug);
};

let mongoose = require('mongoose');
mongoose.Promise = Promise;

class Mongo {

  constructor(prefix = '', urls, debug = false) {
    if (debug) {
      const logger = require('winston-proxy')('Mongo');
      mongoose.set('debug', (coll, method, query, doc) => {
        logger.info('query ', coll, method, query);
      });
    }
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
      createTime: {
        type: Date,
        default: Date.now()
      },
      updateTime: {
        type: Date,
        index: true
      },
      type: String,
      token: String,
      package_name: String
    });
    deviceSchema.index({
      uid: 1,
      platform: 1
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
        type: String //调用notification 接口返回的 id
      },
      expireAt: {
        type: Date //控制数据过期时间
      },
      timeStart: {
        type: Date, // 调用时间
        index: true
      },
      apiIp: String, //调用的api实例ip
      callerIp: String, //调用者IP
      devices: { //推送目标pushId
        type: [String],
        index: true
      },
      uids: { //推送目标uid
        type: [String],
        index: true
      },
      notification: String, //推送title
      ttl: Number, // 调用notification 传的timeToLive参数
      click_android: Number, //安卓点击数 目前统计偏低
      target_android: Number, //安卓发送数
      arrive_android: Number, //安卓送达数
      arrive_umeng: Number, // 友盟送达数
      click_apn: Number, // ios点击数 目前统计偏低
      target_apn: Number, // ios发送数
      arrive_apn: Number, // ios送达数
      click_huawei: Number, // 华为点击数 目前统计偏低
      target_huawei: Number, // 华为发送数
      arrive_huawei: Number, // 华为送达数
      click_xiaomi: Number, // 小米点击数
      xiaomi_msg_id: String, // 调用小米接口返回的id
      umeng_click: Number, // 友盟点击数 目前统计偏低
      umeng_task_id: String, // 调用友盟接口返回的id
      type: {
        type: String, // 调用notification 传的type参数
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
        this.connections[this.urls.default] = mongoose.createConnection(this.urls.default, {
          db: {
            safe: false
          }
        });
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