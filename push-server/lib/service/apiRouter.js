module.exports = ApiRouter;

var logger = require('../log/index.js')('ApiRouter');

var util = require('../util/util.js');
var request = require('request');
const pushEvent = 'push';
var serverIndex = 0;

function ApiRouter(uidStore, notificationService, ttlService, tagService, maxPushIds, remoteUrls) {
    if (!(this instanceof ApiRouter)) return new ApiRouter(uidStore, notificationService, ttlService, tagService, maxPushIds, remoteUrls);
    this.uidStore = uidStore;
    this.notificationService = notificationService;
    this.ttlService = ttlService;
    this.tagService = tagService;
    this.maxPushIds = maxPushIds || 1000;
    this.remoteUrls = remoteUrls;
}

ApiRouter.prototype.notification = function (notification, pushAll, pushIds, uids, tag, timeToLive) {
    var self = this;

    if (pushAll) {
        this.notificationService.sendAll(notification, timeToLive);
    } else if (pushIds) {
        this.sendNotificationByPushIds(notification, pushIds, timeToLive);
    } else if (uids) {
        uids.forEach(function (uid) {
            self.uidStore.getPushIdByUid(uid, function (pushIds) {
                self.sendNotificationByPushIds(notification, pushIds, timeToLive);
            });
        });
    } else if (tag) {
        var batch = [];
        this.tagService.scanPushIdByTag(tag, this.maxPushIds, function (pushId) {
            batch.push(pushId);
            if (batch.length == self.maxPushIds) {
                self.sendNotificationByPushIds(notification, batch, timeToLive);
                batch = [];
            }
        }, function () {
            self.sendNotificationByPushIds(notification, batch, timeToLive);
        });
    }
};

ApiRouter.prototype.push = function (pushData, topic, pushIds, uids, timeToLive) {
    var self = this;
    if (pushIds) {
        pushIds.forEach(function (id) {
            self.ttlService.addTTL(id, pushEvent, timeToLive, pushData, true);
            self.ttlService.emitPacket(id, pushEvent, pushData);
        });
    } else if (uids) {
        uids.forEach(function (id) {
            self.uidStore.getPushIdByUid(id, function (pushIds) {
                pushIds.forEach(function (id) {
                    self.ttlService.addTTL(id, pushEvent, timeToLive, pushData, true);
                    self.ttlService.emitPacket(id, pushEvent, pushData);
                });
            });
        });
    } else if (topic) {
        self.ttlService.addTTL(topic, pushEvent, timeToLive, pushData, false);
        self.ttlService.emitPacket(topic, pushEvent, pushData);
    }
};

ApiRouter.prototype.sendNotificationByPushIds = function (notification, pushIds, timeToLive) {
    if (pushIds.length == 0) {
        return;
    }
    if (pushIds.length > this.maxPushIds && this.remoteUrls) {
        logger.info("sendNotification to remote api ", this.maxPushIds, pushIds.length);
        var batch = [];
        var self = this;
        pushIds.forEach(function (pushId, index) {
            batch.push(pushId);
            if (batch.length == self.maxPushIds || index == pushIds.length - 1) {
                self.callRemoteNotification(notification, batch, timeToLive);
                batch = [];
            }
        });
        this.callRemoteNotification(notification, batch, timeToLive);
    } else if (pushIds.length == this.maxPushIds && this.remoteUrls) {
        this.callRemoteNotification(notification, pushIds, timeToLive);
    } else {
        this.notificationService.sendByPushIds(pushIds, timeToLive, notification);
    }
};

ApiRouter.prototype.callRemoteNotification = function (notification, pushIds, timeToLive) {
    serverIndex++;
    if (serverIndex == this.remoteUrls.length) {
        serverIndex = 0;
    }
    var apiUrl = this.remoteUrls[serverIndex % this.remoteUrls.length];

    request({
            url: apiUrl + "/api/notification",
            method: "post",
            form: {
                pushId: JSON.stringify(pushIds),
                notification: JSON.stringify(notification),
                timeToLive: timeToLive
            }
        }, function (error) {
            logger.info("call remote api batch ", pushIds.length, apiUrl, error);
        }
    );
};