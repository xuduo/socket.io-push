module.exports = (mongo) => {
  return new ConnectService(mongo);
};

const logger = require('winston-proxy')('ConnectService');

class ConnectService {
  constructor(mongo) {
    const ipPath = process.cwd() + "/ip";
    const fs = require('fs');
    let ip;
    if (fs.existsSync(ipPath)) {
      ip = fs.readFileSync(ipPath, "utf8").trim();
    }
    logger.debug("ip file %s %s", ipPath, ip);
    this.id = '';
    if (ip) {
      this.id = ip + ':';
    }
    this.mongo = mongo;
  }

  isConnected(pushId, callback) {
    this.mongo.device.findById(pushId, (err, doc) => {
      if (!err && doc && doc.socketId) {
        callback(true, doc.socketId);
      } else {
        callback(false);
      }
    });
  }

  bindPushId(pushId, socketId, callback) {
    this.mongo.device.update({
      _id: pushId
    }, {
      socketId: (this.id + socketId)
    }, {
      upsert: true
    }, (err, doc) => {
      if (callback) {
        callback();
      }
    });
  }

  unbindPushId(pushId, callback) {
    this.mongo.device.update({
      _id: pushId
    }, {
      $unset: {
        socketId: 1
      }
    }, (err, doc) => {
      if (callback) {
        callback();
      }
    });
  }

  disconnect(socket, callback) {
    this.isConnected(socket.pushId, (connectedOrNot, socketId) => {
      if (connectedOrNot && socketId == (this.id + socket.id)) {
        this.unbindPushId(socket.pushId);
        callback(true);
      } else {
        callback(false);
      }
    })
  }

  connect(socket, callback) {
    this.isConnected(socket.pushId, (connectedOrNot, socketId) => {
      this.bindPushId(socket.pushId, socket.id);
      if (connectedOrNot) {
        callback(false);
      } else {
        callback(true);
      }
    })
  }
}
