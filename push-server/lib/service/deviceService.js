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

  connect(pushId, socketId, ios = false, callback) {
    this.mongo.device.findByIdAndUpdate(pushId, {
      socketId: (this.id + socketId),
      updateTime: Date.now()
    }, {
      upsert: true,
      'new': true
    }, (err, doc) => {
      logger.debug('getDeviceByPushId ', pushId, doc, err);
      if (!err) {
        if (ios && !doc.type) {
          doc.type = 'apnNoToken';
          doc.save((err, doc) => {
            if (!err) {
              callback(doc);
            }
          });
        } else {
          callback(doc);
        }
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
    }, (err, docs) => {
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
    this.mongo.device.find(query, (err, docs) => {
      const result = [];
      if (!err && docs) {
        for (const doc of docs) {
          const device = doc.toObject();
          device.connected = Boolean(device.socketId);
          result.push(device);
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

  addTag(pushId, tag) {
    this.mongo.device.update({
      _id: pushId
    }, {
      $setOnInsert: {
        tags: [tag]
      }
    }, {
      upsert: true
    }, (err, doc) => {
      logger.debug('addTag setOnInsert', pushId, tag, doc, err);
      if (doc.nModified === 0) {
        this.mongo.device.update({
          _id: pushId
        }, {
          $addToSet: {
            tags: tag
          }
        }, (err, doc) => {
          logger.debug('addTag addToSet', pushId, tag, doc, err);
        });
      }
    });
  }

  removeTag(pushId, tag) {
    this.mongo.device.update({
      _id: pushId
    }, {
      $pull: {
        tags: tag
      }
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
    }).cursor({
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

  delApnToken(type, token, bundleId) {
    if (type && token) {
      this.mongo.device.update({
        token,
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
      }).exec();
    }
  }

  setToken(data) {
    this.mongo.device.update({
      _id: data.pushId
    }, {
      type: data.type,
      token: data.token,
      package_name: data.package_name || data.bundleId,
      updateTime: Date.now()
    }, {
      upsert: true
    }).exec();
  }

}
