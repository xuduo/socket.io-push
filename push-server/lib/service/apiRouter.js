module.exports = (deviceService, notificationService, ttlService, maxPushIds, remoteUrls, stats) => {
  return new ApiRouter(deviceService, notificationService, ttlService, maxPushIds, remoteUrls, stats);
};

const logger = require('winston-proxy')('ApiRouter');
const request = require('request');
const pushEvent = 'push';
const randomstring = require("randomstring");

class ApiRouter {

  constructor(deviceService, notificationService, ttlService, maxPushIds, remoteUrls, stats) {
    this.deviceService = deviceService;
    this.stats = stats;
    this.notificationService = notificationService;
    this.ttlService = ttlService;
    this.maxPushIds = maxPushIds || 1000;
    this.remoteUrls = require("../util/infiniteArray")(remoteUrls);
  }

  notification(notification, pushAll, pushIds, uids, tag, timeToLive) {
    this.addIdAndTimestamp(notification);
    if (pushAll) {
      this.notificationService.sendAll(notification, timeToLive);
    } else if (pushIds) {
      this.deviceService.getDevicesByPushIds(pushIds, (devices) => {
        this.sendNotificationByDevices(notification, devices, timeToLive);
      });
    } else if (uids) {
      this.deviceService.getDevicesByUid(uids, (devices) => {
        this.sendNotificationByDevices(notification, devices, timeToLive);
      });
    } else if (tag) {
      let batch = [];
      this.deviceService.scanByTag(tag, (doc) => {
        batch.push(doc);
        if (batch.length == this.maxPushIds) {
          this.sendNotificationByDevices(notification, batch, timeToLive);
          batch = [];
        }
      }, () => {
        if (batch.length != 0) {
          this.sendNotificationByDevices(notification, batch, timeToLive);
        }
      });
    }
    return notification.id;
  }

  push(pushData, topic, pushIds, uids, timeToLive) {
    if (pushIds) {
      pushIds.forEach((id) => {
        this.ttlService.addTTL(id, pushEvent, timeToLive, pushData, true);
        this.ttlService.emitPacket(id, pushEvent, pushData);
      });
    } else if (uids) {
      uids.forEach((id) => {
        const topic = "uid:" + id;
        this.ttlService.addTTL(topic, pushEvent, timeToLive, pushData, true);
        this.ttlService.emitPacket(topic, pushEvent, pushData);
      });
    } else if (topic) {
      this.ttlService.addTTL(topic, pushEvent, timeToLive, pushData, false);
      this.ttlService.emitPacket(topic, pushEvent, pushData);
    }
  }

  sendNotificationByDevices(notification, devices, timeToLive) {
    if (!devices || devices.length == 0) {
      return;
    }
    this.stats.addPushById(devices.length);
    this.notificationService.sendByDevices(devices, timeToLive, notification);
  }

  addIdAndTimestamp(notification) {
    if (!notification.id) {
      notification.id = randomstring.generate(12);
    }
    if (!notification.timestamp) {
      notification.timestamp = Date.now();
    }
  }

}
