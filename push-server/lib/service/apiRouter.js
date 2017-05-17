module.exports = (uidStore, notificationService, ttlService, tagService, maxPushIds, remoteUrls) => {
  return new ApiRouter(uidStore, notificationService, ttlService, tagService, maxPushIds, remoteUrls);
};

const logger = require('winston-proxy')('ApiRouter');
const request = require('request');
const pushEvent = 'push';
const randomstring = require("randomstring");

class ApiRouter {

  constructor(uidStore, notificationService, ttlService, tagService, maxPushIds, remoteUrls) {
    this.uidStore = uidStore;
    this.notificationService = notificationService;
    this.ttlService = ttlService;
    this.tagService = tagService;
    this.maxPushIds = maxPushIds || 1000;
    this.remoteUrls = require("../util/infiniteArray")(remoteUrls);
  }

  notification(notification, pushAll, pushIds, uids, tag, timeToLive) {
    this.addIdAndTimestamp(notification);
    if (pushAll) {
      this.notificationService.sendAll(notification, timeToLive);
    } else if (pushIds) {
      this.sendNotificationByPushIds(notification, pushIds, timeToLive);
    } else if (uids) {
      uids.forEach((uid) => {
        this.uidStore.getPushIdByUid(uid, (pushIds) => {
          this.sendNotificationByPushIds(notification, pushIds, timeToLive);
        });
      });
    } else if (tag) {
      let batch = [];
      this.tagService.scanPushIdByTag(tag, (pushId) => {
        batch.push(pushId);
        if (batch.length == this.maxPushIds) {
          this.sendNotificationByPushIds(notification, batch, timeToLive);
          batch = [];
        }
      }, () => {
        if (batch.length != 0) {
          this.sendNotificationByPushIds(notification, batch, timeToLive);
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

  sendNotificationByPushIds(notification, pushIds, timeToLive) {
    if (pushIds.length == 0) {
      return;
    }
    if (pushIds.length >= this.maxPushIds && this.remoteUrls.hasNext()) {
      logger.info("sendNotification to remote api ", this.maxPushIds, pushIds.length);
      let batch = [];
      pushIds.forEach((pushId, index) => {
        batch.push(pushId);
        if (batch.length == this.maxPushIds || index == pushIds.length - 1) {
          this.callRemoteNotification(notification, batch, timeToLive);
          batch = [];
        }
      });
    } else {
      this.notificationLocal(notification, pushIds, timeToLive);
    }
  }

  callRemoteNotification(notification, pushIds, timeToLive, errorCount = 0) {
    const apiUrl = this.remoteUrls.next();
    request({
      url: apiUrl + "/api/routeNotification",
      method: "post",
      form: {
        pushId: JSON.stringify(pushIds),
        notification: JSON.stringify(notification),
        timeToLive: timeToLive
      }
    }, error => {
      logger.info("call remote api batch ", pushIds.length, apiUrl, error);
      if (error && errorCount < 3) {
        this.callRemoteNotification(notification, pushIds, timeToLive, errorCount + 1);
      }
    });
  }

  notificationLocal(notification, pushIds, timeToLive) {
    this.notificationService.sendByPushIds(pushIds, timeToLive, notification);
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
