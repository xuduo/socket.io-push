module.exports = (providerFactory, mongo, ttlService) => {
  return new NotificationService(providerFactory, mongo, ttlService);
};

const logger = require('winston-proxy')('NotificationService');
const async = require('async');

class NotificationService {

  constructor(providerFactory, mongo, ttlService) {
    this.mongo = mongo;
    this.ttlService = ttlService;
    this.providerFactory = providerFactory;
  }

  sendByDevices(devices, timeToLive, notification, type) {
    const mapTypeToToken = {};
    let sendViaTtlService = 0;
    for (const device of devices) {
      if (!device.token || device.type == 'umeng') {
        logger.debug("send notification in socket.io, connection", device);
        sendViaTtlService++;
        this.ttlService.emitPacket(device._id, 'noti', notification);
        if (!device.socketId) {
          this.ttlService.addTTL(device._id, 'noti', timeToLive, notification, true);
        }
      }
      if (device.type && device.token && device.package_name) {
        const tokenList = mapTypeToToken[device.type] || [];
        mapTypeToToken[device.type] = tokenList;
        tokenList.push(device);
      }
    }
    this.providerFactory.sendMany(notification, mapTypeToToken, timeToLive);
    return sendViaTtlService;
  }

  sendAll(notification, timeToLive) {
    this.providerFactory.sendAll(notification, timeToLive);
  }

}