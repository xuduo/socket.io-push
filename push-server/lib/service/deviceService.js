module.exports = (mongo, uidStore) => {
  return new DeviceService(mongo, uidStore);
};

const logger = require('winston-proxy')('DeviceService');

class DeviceService {

  constructor(mongo, uidStore) {
    this.mongo = mongo;
    this.bindUid = uidStore.bindUid.bind(uidStore);
    this.removePushId = uidStore.removePushId.bind(uidStore);
    this.removeUid = uidStore.removeUid.bind(uidStore);
    this.getPushIdByUid = uidStore.getPushIdByUid.bind(uidStore);
    this.publishBindUid = uidStore.publishBindUid.bind(uidStore);
    this.publishUnbindUid = uidStore.publishUnbindUid.bind(uidStore);

    this.id = '';
    if (process.env.ip) {
      this.id = process.env.ip + ':';
    }
    logger.debug("this.id ", this.id);
  }

  connect(data, socketId, callback) {
    const update = {
      socketId: (this.id + socketId),
      updateTime: Date.now()
    };
    if (data.tags) {
      update.tags = data.tags;
    }
    if (data.token) {
      update.token = data.token.token;
      update.package_name = data.token.package_name;
      update.type = data.token.type;
    }
    if (!data.token) {
      if (data.platform == 'ios') {
        update['$setOnInsert'] = {
          type: 'apnNoToken'
        }
      } else if (data.platform == 'android') {
        update['$setOnInsert'] = {
          type: 'androidNoToken'
        }
      }
    } else { // 处理某app误用 ios sdk 0.0.9
      this.deleteOldToken(data.id, data.token);
    }
    this.mongo.device.findByIdAndUpdate({
      _id: data.id
    }, update, {
      upsert: true,
      'new': true
    }, (err, doc) => {
      logger.debug('connect ', data, doc, err);
      if (!err && doc) {
        callback(doc);
      }
    });
  }

  disconnect(socket, callback) {
    this.mongo.device.findByIdAndUpdate(socket.pushId, {
      $unset: {
        socketId: 1
      },
      $set: {
        updateTime: Date.now()
      }
    }, (err, device) => {
      if (!err && device) {
        if (device.socketId == (this.id + socket.id)) {
          return callback(true)
        }
      }
      return callback(false);
    });
  }

  getDeviceByPushId(pushId, callback) {
    this.mongo.device.findById(pushId, (err, device) => {
      if (!err && device) {
        device = device.toObject();
        device.connected = Boolean(device.socketId);
        callback(device);
      } else {
        callback({});
      }
    });
  }

  getDevicesByPushIds(pushIds, callback) {
    this.mongo.device.find({
      _id: {
        $in: pushIds
      }
    }).lean().exec((err, docs) => {
      if (!err && docs) {
        callback(docs);
      } else {
        callback([]);
        logger.error('getDevicesByUid error', uid, doc, err);
      }
    });
  }

  getDevicesByUid(uid, callback) {
    let query;
    if (uid.constructor === Array) {
      query = {
        uid: {
          $in: uid
        }
      };
    } else {
      query = {
        uid: uid
      }
    }
    this.mongo.device.find(query).lean().exec((err, docs) => {
      const result = [];
      if (!err && docs) {
        for (const doc of docs) {
          doc.connected = Boolean(doc.socketId);
          result.push(doc);
        }
      } else {
        logger.error('getDevicesByUid error', uid, docs, err);
      }
      callback(result);
    });
  }

  setTags(pushId, tags) {
    this.mongo.device.update({
      _id: pushId
    }, {
      tags
    }, {
      upsert: true
    }).exec();
  }

  getPushIdsByTag(tag, callback) {
    this.mongo.device.find({
      tags: tag
    }, (err, docs) => {
      const pushIds = [];
      if (!err && docs) {
        for (let doc of docs) {
          pushIds.push(doc._id);
        }
      }
      callback(pushIds);
    });
  }

  getTagsByPushId(pushId, callback) {
    this.mongo.device.findById(
      pushId, (err, doc) => {
        logger.debug('getTagsByPushId ', pushId, err, doc);
        if (!err && doc) {
          callback(doc.tags || []);
        } else {
          callback([]);
        }
      });
  }

  scanByTag(tag, callback, endCallback) {
    const cursor = this.mongo.device.find({
      'tags': tag
    }).lean().cursor({
      batchSize: 1000
    });
    cursor.on('data', (doc) => {
      callback(doc);
    }).on('error', () => {
      endCallback();
    }).on('end', () => {
      endCallback();
    });
  }

  delApnTokens(type, tokens, bundleId) {
    if (type && tokens) {
      this.mongo.device.update({
        token: {
          $in: tokens
        },
        type,
        package_name: bundleId
      }, {
        $unset: {
          token: 1,
          package_name: 1
        },
        $set: {
          type: 'apnNoToken'
        }
      }, {
        multi: true
      }).exec();
    }
  }

  deleteOldToken(pushId, tokenData, callback) {
    this.mongo.device.find(tokenData, (err, docs) => {
      if (!err && docs) {
        for (const doc of docs) {
          if (doc._id != pushId) {
            logger.debug('delete other same token device', doc);
            doc.remove();
          }
        }
      }
      if (callback) {
        callback();
      }
    });
  }

  setToken(pushId, tokenData) {
    this.deleteOldToken(pushId, tokenData, () => {
      this.mongo.device.update({
        _id: pushId
      }, tokenData, {
        upsert: true
      }).exec();
    });
  }
}
