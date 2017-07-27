module.exports = (deviceService, notificationService, ttlService, batchSize, bufferSize, remoteUrls, stats) => {
  return new ApiRouter(deviceService, notificationService, ttlService, batchSize, bufferSize, remoteUrls, stats);
};

const logger = require('winston-proxy')('ApiRouter');
const request = require('request');
const pushEvent = 'push';
const randomstring = require("randomstring");

class ApiRouter {

  constructor(deviceService, notificationService, ttlService, batchSize, bufferSize, remoteUrls, stats) {
    this.deviceService = deviceService;
    this.stats = stats;
    this.notificationService = notificationService;
    this.ttlService = ttlService;
    this.batchSize = batchSize || 1000;
    this.remoteUrls = require("../util/infiniteArray")(remoteUrls);
    this.notificationBuffer = [];
    this.bufferSize = bufferSize || 0;
    this.bufferTask = null;
  }

  sendFromBuffer() {
    const notiParams = this.notificationBuffer.shift();
    if (notiParams) {
      if (notiParams.pushIds) {
        this.deviceService.getDevicesByPushIds(notiParams.pushIds, (devices) => {
          this.sendNotificationByDevices(notiParams.notification, devices, notiParams.timeToLive);
          this.bufferTaskDone();
        });
      } else if (notiParams.uids) {
        this.deviceService.getDevicesByUid(notiParams.uids, (devices) => {
          this.sendNotificationByDevices(notiParams.notification, devices, notiParams.timeToLive);
          this.bufferTaskDone();
        });
      } else if (notiParams.tag) {
        let batch = [];
        this.deviceService.scanByTag(notiParams.tag, (doc) => {
          batch.push(doc);
          if (batch.length == this.maxPushIds) {
            this.sendNotificationByDevices(notiParams.notification, batch, notiParams.timeToLive);
            batch = [];
          }
        }, () => {
          if (batch.length != 0) {
            this.sendNotificationByDevices(notiParams.notification, batch, notiParams.timeToLive);
          }
          this.bufferTaskDone();
        });
      }
    }
  }

  bufferTaskDone() {
    this.bufferTask = null;
    this.postBufferTask();
  }

  postBufferTask() {
    logger.debug('postBufferTask bufferSize', this.notificationBuffer.length);
    if (this.bufferSize > 0 && this.notificationBuffer.length > this.bufferSize) {
      logger.error('postBufferTask bufferSize too big dropping all', this.notificationBuffer.length);
      this.notificationBuffer = [];
    }
    if (this.bufferTask == null && this.notificationBuffer.length > 0) {
      this.bufferTask = setTimeout(() => {
        this.sendFromBuffer();
      }, 0);
    }
  }

  notification(notification, pushAll, pushIds, uids, tag, timeToLive) {
    this.addIdAndTimestamp(notification);
    if (pushAll) {
      this.notificationService.sendAll(notification, timeToLive);
    } else {
      let targetName;
      let targets;
      if (pushIds) {
        targetName = 'pushIds';
        targets = pushIds;
      } else if (uids) {
        targetName = 'uids';
        targets = uids;
      } else if (tag) {
        this.pushToNotificationBuffer('tag', tag, notification, timeToLive);
      }
      if (targetName) {
        let split = [];
        for (const item of targets) {
          split.push(item);
          if (split.length == this.batchSize) {
            this.pushToNotificationBuffer(targetName, split, notification, timeToLive);
            split = [];
          }
        }
        if (split.length > 0) {
          this.pushToNotificationBuffer(targetName, split, notification, timeToLive);
        }
      }
      this.postBufferTask();
    }
    return notification.id;
  }

  pushToNotificationBuffer(targetName, targets, notification, timeToLive) {
    const params = {
      notification,
      timeToLive
    };
    params[targetName] = targets;
    this.notificationBuffer.push(params);
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
    this.stats.addSuccess('notificationByDevices', devices.length);
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
