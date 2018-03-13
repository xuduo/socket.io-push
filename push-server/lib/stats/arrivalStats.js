module.exports = (mongo, incrBuffer, topicOnline) => {
  return new ArrivalStats(mongo, incrBuffer, topicOnline);
};

const logger = require('winston-proxy')('ArrivalStats');
const async = require('async');

class ArrivalStats {

  constructor(mongo, incrBuffer, topicOnline) {
    this.mongo = mongo;
    this.topicOnline = topicOnline;
    this.recordKeepTime = 30 * 24 * 3600 * 1000;
    this.incrBuffer = incrBuffer;
    this.ip = process.env.ip;
    logger.debug("ip %s", this.ip);

    const dummy = {
      trace: (packet, callback) => {
        callback(packet);
      }
    };

    this.xiaomiProvider = dummy;
    this.umengProvider = dummy;
  }

  addArrivalInfo(msgId, inc = {}, set = {}) {
    if (!msgId) {
      logger.error('addArrivalInfo no msgId', inc, set);
      return;
    }
    const data = {};
    if (Object.keys(inc).length > 0) {
      data['$inc'] = inc;
    }
    if (Object.keys(set).length > 0) {
      data['$set'] = set;
      this.mongo.arrival.update({
        _id: msgId
      }, data, {
        upsert: true
      }, (err, doc) => {
        logger.debug('addArrivalInfo ', msgId, data, doc, err);
      });
    } else {
      this.incrBuffer.incr(msgId, inc, 'arrival');
    }
  }

  msgToData(msg, ttl, expire = true) {
    const data = {
      notification: msg.message || (msg.apn && msg.apn.alert && msg.apn.alert.body) || (msg.apn && msg.apn.alert) || (msg.android && msg.android.message),
      timeStart: Date.now(),
      ttl
    };
    if (expire) {
      data.expireAt = Date.now() + this.recordKeepTime;
    }
    return data;
  }

  addPushAll(msg, ttl) {
    logger.info('addPushAll, packet:%s', msg.id);
    this.topicOnline.getTopicOnline('noti', (count) => {
      logger.info('packet(%s) init count:%d', msg.id, count);
      const data = this.msgToData(msg, ttl, false);
      data.type = 'pushAll';
      let inc;
      if (msg.android.title && count) {
        inc = {
          'target_android': count
        };
      }
      this.addArrivalInfo(msg.id, inc, data);
    });
  }

  addPushMany(msg, ttl, sentCount, type, devices, uids, remoteAddress) {
    logger.debug('addPushMany, packet: ', msg);
    const data = this.msgToData(msg, ttl);
    data.type = type ? type : 'pushMany';
    if (devices) {
      data.devices = devices;
    }
    if (uids) {
      data.uids = uids;
    }
    data.apiIp = this.ip;
    data.callerIp = remoteAddress;
    this.addArrivalInfo(msg.id, {
      'target_android': sentCount
    }, data);
  }

  getRateStatusBy(field, value, callback) {
    const query = {};
    query[field] = value;
    this.mongo.arrival.find(query)
      .sort({
        'timeStart': -1
      })
      .limit(50)
      .exec((err, docs) => {
        const result = [];
        async.each(docs, (doc, asynccb) => {
          this.calculateArrivalInfo(doc, (info) => {
            if (info) {
              result.push(info);
            }
            asynccb();
          });
        }, (err) => {
          if (err) logger.error('error: ' + err);
          result.sort((l, r) => {
            return new Date(r.timeStart) - new Date(l.timeStart);
          });
          callback(result);
        });
      });
  }

  getRateStatusByType(type, callback) {
    this.getRateStatusBy("type", type, callback);
  }

  getRateStatusByUid(uid, callback) {
    this.getRateStatusBy("uids", uid, callback);
  }

  getRateStatusByDevice(device, callback) {
    this.getRateStatusBy("devices", device, callback);
  }

  calculateArrivalInfo(packet, callback) {
    const result = packet.toObject();

    let apn = {};
    apn.target = parseInt(result.target_apn || 0);
    apn.arrive = parseInt(result.arrive_apn || 0);
    apn.click = parseInt(result.click_apn || 0);
    apn.arrivalRate = apn.target != 0 ? (apn.arrive * 100 / apn.target).toFixed(2) + '%' : 0;
    apn.clickRate = apn.target != 0 ? (apn.click * 100 / apn.target).toFixed(2) + '%' : 0;


    let android = {};
    android.target = parseInt(result.target_android || 0);
    android.arrive = parseInt(result.arrive_android || 0);
    android.arrive_umeng = parseInt(result.arrive_umeng || 0);
    android.click = parseInt(result.click_android || 0);
    android.arrivalRate = android.target != 0 ? (android.arrive * 100 / android.target).toFixed(2) + '%' : 0;
    android.clickRate = android.target != 0 ? (android.click * 100 / android.target).toFixed(2) + '%' : 0;

    if (android.target > 0) {
      result.android = android;
    }
    if (apn.target > 0) {
      result.apn = apn;
    }

    if (packet.timeStart) {
      result.timeValid = new Date(packet.timeStart.getTime() + (packet.ttl || 0)).toLocaleString();
      result.timeStart = packet.timeStart.toLocaleString();
    }

    result.id = result._id;
    delete result._id;

    this.xiaomiProvider.trace(result, (traced) => {
      this.umengProvider.trace(traced, callback);
    });

  }

  getArrivalInfo(id, callback) {
    this.mongo.arrival.findById(id, (err, doc) => {
      logger.debug('getArrivalInfo: ', id, doc);
      if (!err && doc) {
        this.calculateArrivalInfo(doc, callback);
      } else {
        logger.debug('getArrivalInfo error: ', id, doc);
        callback({});
      }
    });
  }

}