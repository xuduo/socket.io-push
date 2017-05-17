module.exports = (mongo, tokenTTL) => {
  return new TokenService(mongo, tokenTTL);
};

const logger = require('winston-proxy')('TokenService');

class TokenService {

  constructor(mongo, tokenTTL) {
    this.mongo = mongo;
    this.tokenTTL = tokenTTL;
  }

  setApnNoToken(pushId) {
    this.mongo.device.update({
      _id: pushId,
      type: null
    }, {
      _id: pushId,
      type: 'apnNoToken',
      updateTime: Date.now()
    }, {
      upsert: true
    });
  }

  delToken(type, token, bundleId) {
    if (type && token) {
      this.mongo.device.remove({
        token,
        type,
        package_name: bundleId
      });
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
    }, (err, doc) => {
      logger.debug("setToken mongo ", doc, err);
    });
  }
}
