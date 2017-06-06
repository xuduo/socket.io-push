module.exports = (pushAllInterval) => {
  return new NotificationProviderFactory(pushAllInterval);
};

const logger = require('winston-proxy')('NotificationProviderFactory');

class NotificationProviderFactory {

  constructor(pushAllInterval = 0) {
    this.providers = {};
    this.keys = [];
    this.pushAllInterval = pushAllInterval;
  }

  addProvider(provider) {
    this.providers[provider.type] = provider;
    this.keys.push(provider.type);
  }

  sendMany(notification, mapTypeToTokenList, timeToLive) {
    for (const type in mapTypeToTokenList) {
      const provider = this.providers[type || "apn"];
      logger.debug("sendMany %s", type);
      if (provider) {
        provider.sendMany(notification, mapTypeToTokenList[type], timeToLive);
      }
    }
  }

  sendAll(notification, timeToLive, callback) {
    logger.info('sendAll task interval', this.pushAllInterval, this.keys, notification);
    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keys[i];
      const provider = this.providers[key];
      setTimeout(() => {
        logger.info('sendAll task ', key, notification);
        provider.sendAll(notification, timeToLive);
      }, this.pushAllInterval * i);
    }
  }

}
