module.exports = (prefix, redis, mongo, io) => {
  return new UidStore(prefix, redis, mongo, io);
};
const logger = require('winston-proxy')('UidStore');

class UidStore {

  constructor(prefix, redis, mongo, io) {
    this.redis = redis;
    this.mongo = mongo;
    this.bindUidCmd = prefix + ':cmd:bindUid';
    this.unbindUidCmd = prefix + ':cmd:unbindUid';
    if (io) {
      this.redis.subscribe(this.bindUidCmd);
      this.redis.subscribe(this.unbindUidCmd);
      this.redis.on('message', (channel, message) => {
        if (channel == this.bindUidCmd) {
          let json = JSON.parse(message);
          io.nsps['/'].adapter.doSocketInRoom(io.nsps['/'], json.pushId, (socket) => {
            logger.debug('redis bindUid join ', json);
            socket.setUid(json.uid);
          });
        } else if (channel == this.unbindUidCmd) {
          let json = JSON.parse(message);
          let room = json.pushId || 'uid:' + json.uid;

          io.nsps['/'].adapter.doSocketInRoom(io.nsps['/'], room, (socket) => {
            logger.debug('redis unbindUid leave ', message);
            socket.setUid(null);
          });
        }
      });
    }
  }

  publishBindUid(pushId, uid) {
    this.redis.publish(this.bindUidCmd, JSON.stringify({
      pushId: pushId,
      uid: uid
    }));
  }

  publishUnbindUid(pushId, uid) {
    this.redis.publish(this.unbindUidCmd, JSON.stringify({
      pushId: pushId,
      uid: uid
    }));
  }

  bindUid(pushId, uid, platform, platformLimit = 0) {
    logger.debug('bindUid pushId %s %s', uid, pushId, platformLimit);
    const device = {
      uid,
      updateTime: Date.now()
    };
    if (platform) {
      device.platform = platform;
    }

    this.mongo.device.update({
      _id: pushId
    }, device, {
      upsert: true
    }, (err) => {
      logger.debug('update uid success ', pushId, uid);
      if (!err) {
        if (platformLimit > 0) {
          let query = {
            uid
          };
          if (platform != 'all') {
            query.platform = platform;
          }
          this.mongo.device.find(query).sort('-updateTime').exec((err, devices) => {
            if (!err && devices) {
              for (let i = 0; i < devices.length; i++) {
                if (i >= platformLimit) {
                  logger.debug('remove other binded uid', uid, devices[i]._id);
                  devices[i].uid = undefined;
                  devices[i].updateTime = Date.now();
                  devices[i].save();
                }
              }
            }
          });
        }
      }
    });
  }

  removePushId(pushId) {
    logger.debug('removePushId pushId  %s', pushId);
    this.mongo.device.update({
      _id: pushId
    }, {
      $unset: {
        uid: 1
      }
    }, (err) => {
      if (err) {
        logger.error('mongodb removePushId error', err);
      }
    });
  }

  removeUid(uid) {
    this.mongo.device.update({
      uid
    }, {
      $unset: {
        uid: 1
      }
    }, {
      multi: true
    }, (err) => {
      logger.debug('removeUid uid  ', uid, err);
      if (err) {
        logger.error('mongodb removePushId error', err);
      }
    });
  }

  getUidByPushId(pushId, callback) {
    this.mongo.device.findById(pushId, (err, device) => {
      logger.debug('getUidByPushId %s %s', pushId, device);
      if (!err && device) {
        callback(device.uid);
      } else {
        callback();
      }
    });
  }

  getPushIdByUid(uid, callback) {
    this.mongo.device.find({
      uid: uid
    }, (err, devices) => {
      const pushIds = [];
      logger.debug('getPushIdByUid %s %s %s', uid, err, devices);
      if (!err && devices) {
        devices.forEach((device) => {
          pushIds.push(device.id);
        });
      }
      callback(pushIds);
    });
  }
}
