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

  sendByDevices(devices, timeToLive, notification) {
    const mapTypeToToken = {};
    let sendViaTtlService = 0;
    for (const device of devices) {
      if (!device.token || device.type == 'umeng') {
        logger.debug("send notification in socket.io, connection", device);
        if (device.socketId) {
          sendViaTtlService++;
          this.ttlService.emitPacket(device._id, 'noti', notification);
        } else {
          this.ttlService.addTTL(device._id, 'noti', timeToLive, notification, true);
        }
      } else {
        const tokenList = mapTypeToToken[device.type] || [];
        mapTypeToToken[device.type] = tokenList;
        tokenList.push(device);
      }
    }
    this.arrivalRate.addPushMany(notification, timeToLive, sendViaTtlService);
    this.providerFactory.sendMany(notification, mapTypeToToken, timeToLive);
  }

  sendAll(notification, timeToLive) {
    this.providerFactory.sendAll(notification, timeToLive);
  }

}
