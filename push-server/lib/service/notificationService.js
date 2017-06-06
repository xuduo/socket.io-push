module.exports = (providerFactory, mongo, ttlService, arrivalRate) => {
  return new NotificationService(providerFactory, mongo, ttlService, arrivalRate);
};

const logger = require('winston-proxy')('NotificationService');
const async = require('async');

class NotificationService {

  constructor(providerFactory, mongo, ttlService, arrivalRate) {
    this.mongo = mongo;
    this.ttlService = ttlService;
    this.providerFactory = providerFactory;
    this.arrivalRate = arrivalRate;
  }

  getTokenDataByPushId(pushId, callback) {
    this.mongo.device.findById(pushId, (err, doc) => {
      if (!err && doc) {
        if (doc.type) {
          callback(doc);
          return;
        }
      }
      callback();
    });
  }

  sendByPushIds(pushIds, timeToLive, notification) {
    const mapTypeToToken = {};
    let sendViaTtlService = 0;
    async.each(pushIds, (pushId, callback) => {
      //集合元素并发执行,如果全部未出错,则最后callback中err为undefined;
      // 否则如果中途出错,直接调用callback,其他未执行完的任务继续(只执行一次callback..)
      this.getTokenDataByPushId(pushId, (token) => {
        logger.debug('pushId: %s to token: %j', pushId, token);
        if (token) { //小米&华为&苹果之外的终端没有对应的token
          const tokenList = mapTypeToToken[token.type] || [];
          tokenList.push(token);
          mapTypeToToken[token.type] = tokenList;
        }
        if (!token || token.type == 'umeng') {
          logger.debug("send notification in socket.io, connection %s", pushId);
          sendViaTtlService++;
          this.ttlService.addTTL(pushId, 'noti', timeToLive, notification, true);
          this.ttlService.emitPacket(pushId, 'noti', notification);
        }
        callback();
      });
    }, () => {
      this.arrivalRate.addPushMany(notification, timeToLive, sendViaTtlService);
      this.providerFactory.sendMany(notification, mapTypeToToken, timeToLive);
    });
  }

  sendAll(notification, timeToLive) {
    this.providerFactory.sendAll(notification, timeToLive);
  }

}
