module.exports = ApiRouter;

var logger = require('../log/index.js')('ApiRouter');

var util = require('../util/util.js');
var apn = require('apn');
var request = require('superagent');

function ApiRouter(uidStore, notificationService, ttlService, tagService, maxPushIds, req) {
    if (!(this instanceof ApiRouter)) return new ApiRouter(uidStore, notificationService, ttlService, tagService, maxPushIds, req);
    this.uidStore = uidStore;
    this.notificationService = notificationService;
    this.ttlService = ttlService;
    this.tagService = tagService;
    this.maxPushIds = maxPushIds || 1000;
}

ApiRouter.prototype.notification = function (notification, pushAll, pushIds, uids, tags, timeToLive) {
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
    } else if (tags) {
        tags.forEach(function (tag) {
            self.tagService.getPushIdsByTag(tag, function (pushIds) {
                self.sendNotificationByPushIds(notification, pushIds, timeToLive);
            })
        });
    }
};

ApiRouter.prototype.push = function (pushData, topic, pushIds, uids, timeToLive) {
    var self = this;
    if (pushIds) {
        pushIds.forEach(function (id) {
            self.ttlService.addPacketAndEmit(id, 'push', timeToLive, pushData, true);
        });
    } else if (uids) {
        uids.forEach(function (id) {
            self.uidStore.getPushIdByUid(id, function (pushIds) {
                pushIds.forEach(function (result) {
                    self.ttlService.addPacketAndEmit(result, 'push', timeToLive, pushData, true);
                });
            });
        });
    } else if (topic) {
        self.ttlService.addPacketAndEmit(topic, 'push', timeToLive, pushData, false);
    }
};

ApiRouter.prototype.sendNotificationByPushIds = function (notification, pushIds, timeToLive) {
    this.notificationService.sendByPushIds(pushIds, timeToLive, notification);
};