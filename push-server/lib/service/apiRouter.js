module.exports = (deviceService, notificationService, ttlService, batchSize, remoteUrls, stats, arrivalStats) => {
  return new ApiRouter(deviceService, notificationService, ttlService, batchSize, remoteUrls, stats, arrivalStats);
};

const logger = require('winston-proxy')('ApiRouter');
const request = require('request');
const pushEvent = 'push';
const randomstring = require('randomstring');
const versionCompare = require('../util/versionCompare');

class ApiRouter {

  constructor(deviceService, notificationService, ttlService, batchSize, remoteUrls, stats, arrivalStats) {
    this.deviceService = deviceService;
    this.stats = stats;
    this.arrivalStats = arrivalStats;
    this.notificationService = notificationService;
    this.ttlService = ttlService;
    this.batchSize = batchSize || 1000;
    this.remoteUrls = require("../util/infiniteArray")(remoteUrls);
  }

  splitTargets(targets) {
    let split;
    let done = false;
    if (targets.length > this.batchSize) {
      split = [];
      for (let i = 0; i < this.batchSize; i++) {
        split.push(targets[i]);
      }
      targets.splice(0, this.batchSize)
    } else {
      split = targets;
      done = true;
    }
    return {
      split,
      done
    }
  }

  doSendNotification(notiParams) {
    if (notiParams.pushIds) {
      let split;
      do {
        split = this.splitTargets(notiParams.pushIds);
        this.deviceService.getDevicesByPushIds(split.split, (devices) => {
          this.sendNotificationByDevices(notiParams, devices);
        });
      } while (!split.done)

    } else if (notiParams.uids) {
      let split;
      do {
        split = this.splitTargets(notiParams.uids);
        this.deviceService.getDevicesByUid(split.split, (devices) => {
          this.sendNotificationByDevices(notiParams, devices);
        });
      } while (!split.done)
    } else if (notiParams.tag) {
      let batch = [];
      this.deviceService.scanByTag(notiParams.tag, (doc) => {
        batch.push(doc);
        if (batch.length == this.maxPushIds) {
          this.sendNotificationByDevices(notiParams, batch);
          batch = [];
        }
      }, () => {
        if (batch.length != 0) {
          this.sendNotificationByDevices(notiParams, batch);
        }
      });
    } else {
      logger.error('invalid notiParams', notiParams);
    }
  }

  notification(params) {
    this.addIdAndTimestamp(params.notification);
    if (params.pushAll) {
      this.notificationService.sendAll(params.notification, params.timeToLive);
      this.arrivalStats.addPushAll(params.notification, params.timeToLive);
    } else {
      this.doSendNotification(params);
    }
    return params.notification.id;
  }

  push(pushData, topic, pushIds, uids, timeToLive) {
    if (pushIds) {
      pushIds.forEach((id) => {
        this.ttlService.addTTL(id, pushEvent, timeToLive, pushData, true);
      });
      this.ttlService.emitPacket(pushIds, pushEvent, pushData);
    } else if (uids) {
      const topics = [];
      uids.forEach((id) => {
        topics.push("uid:" + id);
      });
      if (timeToLive > 0) {
        this.deviceService.getDevicesByUid(uids, (devices) => {
          for (const device of devices) {
            this.ttlService.addTTL(device._id, pushEvent, timeToLive, pushData, true);
          }
          this.ttlService.emitPacket(topics, pushEvent, pushData);
        });
      } else {
        this.ttlService.emitPacket(topics, pushEvent, pushData);
      }
    } else if (topic) {
      this.ttlService.addTTL(topic, pushEvent, timeToLive, pushData, false);
      this.ttlService.emitPacket(topic, pushEvent, pushData);
    }
  }

  sendNotificationByDevices(params, devices) {
    this.filterByTag(params, devices);
    if (!devices || devices.length == 0) {
      return;
    }
    const sendViaTtlService = this.notificationService.sendByDevices(devices, params.timeToLive, params.notification, params.type);
    this.arrivalStats.addPushMany(params.notification, params.timeToLive, sendViaTtlService, params.type, devices, params.uids, params.remoteAddress);
    this.stats.addSuccess('notificationByDevices', devices.length);
  }

  filterByTag(params, devices) {
    if ((params.tagStart && params.tagLessThan) || (params.tagStart && params.tagGreaterThan)) {
      for (let i = devices.length - 1; i >= 0; i--) {
        let match = false;
        if (devices[i].tags) {
          for (const tag of devices[i].tags) {
            if (tag.startsWith(params.tagStart)) {
              const tail = tag.substr(params.tagStart.length);
              if (params.tagLessThan) {
                if (versionCompare(tail, params.tagLessThan) < 0) {
                  match = true;
                } else {
                  break;
                }
              }
              if (params.tagGreaterThan) {
                if (versionCompare(tail, params.tagGreaterThan) > 0) {
                  match = true;
                } else {
                  match = false;
                }
              }
              break;
            }
          }
        }
        if (!match) {
          logger.debug('do not match ', devices[i]);
          devices.splice(i, 1);
        }
      }
    }
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