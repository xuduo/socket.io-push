module.exports = (mongo, topicOnline, xiaomiProvider) => {
  return new ArrivalStats(mongo, topicOnline, xiaomiProvider);
};

const logger = require('winston-proxy')('ArrivalStats');
const async = require('async');

class ArrivalStats {

  constructor(mongo, topicOnline) {
    this.mongo = mongo;
    this.topicOnline = topicOnline;
    this.recordKeepTime = 30 * 24 * 3600 * 1000;

    const dummy = {
      trace: (packet, callback) => {
        callback(packet);
      }
    };

    this.xiaomiProvider = dummy;
    this.umengProvider = dummy;
  }

  addArrivalInfo(msgId, inc, set = {}) {
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
    }
    this.mongo.arrival.update({
      _id: msgId
    }, data, {
      upsert: true
    }, (err, doc) => {
      logger.debug('addArrivalInfo ', msgId, data, doc, err);
    });
  }

  msgToData(msg, ttl, expire = true) {
    const data = {
      notification: msg.message || (msg.apn && msg.apn.alert) || (msg.android && msg.android.message),
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
      this.addArrivalInfo(msg.id, {
        'target_android': count
      }, data);
    });
  }

  addPushMany(msg, ttl, sentCount) {
    logger.info('addPushMany, packet: %s', msg);
    const data = this.msgToData(msg, ttl);
    data.type = 'pushMany';
    this.addArrivalInfo(msg.id, {
      'target_android': sentCount
    }, data);
  }

  getRateStatusByType(type, callback) {
    this.mongo.arrival.find({
        type: type
      })
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

    result.timeValid = new Date(packet.timeStart.getTime() + (packet.ttl || 0)).toLocaleString();
    result.timeStart = packet.timeStart.toLocaleString();

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
