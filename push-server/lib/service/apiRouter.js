module.exports = ApiRouter;

var logger = require('../log/index.js')('ApiRouter');

var util = require('../util/util.js');
var request = require('request');
const pushEvent = 'push';

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
        this.tagService.getPushIdsByTag(tag, function (pushIds) {
            self.sendNotificationByPushIds(notification, pushIds, timeToLive);
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
    if (pushIds.length > this.maxPushIds && this.remoteUrls) {
        logger.info("sendNotification to remote api ", this.maxPushIds, pushIds.length);
        var batch = [];
        var serverIndex = 0;
        var self = this;
        pushIds.forEach(function (pushId, index) {
            batch.push(pushId);
            if (batch.length == self.maxPushIds || index == pushIds.length - 1) {
                var apiUrl = self.remoteUrls[serverIndex++ % self.remoteUrls.length];
                self.callRemoteNotification(apiUrl, notification, batch, timeToLive);
                batch.length = 0;
            }
        });
    } else {
        this.notificationService.sendByPushIds(pushIds, timeToLive, notification);
    }
};

ApiRouter.prototype.callRemoteNotification = function (apiUrl, notification, pushIds, timeToLive) {
    request({
            url: apiUrl + "/api/notification",
            method: "post",
            form: {
                pushId: JSON.stringify(pushIds),
                notification: JSON.stringify(notification),
                timeToLive: timeToLive
            }
        }, function (error, response, body) {
            logger.debug("call remote api batch", body);
        }
    );
};