module.exports = ApnProvider;

var logger = require('../log/index.js')('ApnProvider');

var util = require('../util/util.js');
var apn = require('apn');
var request = require('superagent');

function ApnProvider(apnConfigs, sliceServers, redis, stats, tokenTTL) {
    if (!(this instanceof ApnProvider)) return new ApnProvider(apnConfigs, sliceServers, redis, stats, tokenTTL);
    this.redis = redis;
    this.type = "apn";
    this.apnConnections = {};
    this.stats = stats;
    this.tokenTTL = tokenTTL;
    this.sliceServers = sliceServers;
    var self = this;
    var fs = require('fs');
    var ca = [fs.readFileSync(__dirname + "/../../cert/entrust_2048_ca.cer")];

    apnConfigs.forEach(function (apnConfig, index) {
        apnConfig.maxConnections = apnConfig.maxConnections || 10;
        apnConfig.ca = ca;
        apnConfig.errorCallback = function (errorCode, notification, device) {
            if (device && device.token) {
                var id = device.token.toString('hex');
                logger.error("apn errorCallback errorCode %d %s", errorCode, id);
                stats.addPushError(1, errorCode, self.type);
                redis.hdel("apnTokens#" + apnConfig.bundleId, id);
                redis.get("tokenToPushId#apn#" + id, function (err, oldPushId) {
                    logger.error("apn errorCallback pushId %s", oldPushId);
                    if (oldPushId) {
                        redis.del("pushIdToToken#" + oldPushId);
                        redis.del("tokenToPushId#apn#" + id);
                    }
                });
            } else {
                logger.error("apn errorCallback no token %s %j", errorCode, device);
            }
        }
        var connection = apn.Connection(apnConfig);
        connection.index = index;
        self.apnConnections[apnConfig.bundleId] = connection;
        connection.on("transmitted", function () {
            stats.addPushSuccess(1, self.type);
        });
        logger.info("apnConnections init for %s maxConnections %s", apnConfig.bundleId, apnConfig.maxConnections);
    });

    this.bundleIds = Object.keys(this.apnConnections);
    this.defaultBundleId = this.bundleIds[0];
    logger.info("defaultBundleId %s", this.defaultBundleId);
}

ApnProvider.prototype.sendMany = function (notification, apnDataList, timeToLive) { 
    if (!notification.apn || !this.apnConnections) {
        logger.debug("no apn info skip");
        return;
    }
    
    var mapApnToken = {};
    for(apnData in apnDataList){
        bundleId = apnDataList[apnData].bundleId;
        apnList = mapApnToken[bundleId] || [];
        apnList.push(apnDataList[apnData].token);
        mapApnToken[bundleId] = apnList;
    }

    for(bundle in mapApnToken){
        var apnConnection = this.apnConnections[bundle];
        if(apnConnection){
            this.stats.addPushTotal(1, this.type);
            var note = toApnNotification(notification, timeToLive);
            apnConnection.pushNotification(note, mapApnToken[bundle]);
            logger.debug("send to notification to ios %s %s", bundle, mapApnToken[bundle]);
        }
    }
};

ApnProvider.prototype.addToken = function (data) {
    logger.debug("addToken %j", data);
    if (data.bundleId && data.token) {
        this.redis.hset("apnTokens#" + data.bundleId, data.token, Date.now());
    }
};

ApnProvider.prototype.sliceSendAll = function (notification, timeToLive, pattern) {
    var self = this;
    var note = toApnNotification(notification, timeToLive);
    this.bundleIds.forEach(function (bundleId) {
        self.redis.hscan("apnTokens#" + bundleId, "0", "MATCH", pattern, "COUNT", 10000000, function (err, replies) {
            if (replies.length == 2) {
                self.sendToApn(replies[1], bundleId, note);
            }
        });
    });
};

ApnProvider.prototype.sendToApn = function (tokenToTime, bundleId, note) {
    var apnConnection = this.apnConnections[bundleId];
    var timestamp = Date.now();
    if (tokenToTime) {
        var tokens = [];
        if (Array.isArray(tokenToTime)) {
            for (var i = 0; i + 1 < tokenToTime.length; i = i + 2) {
                var token = tokenToTime[i];
                var time = tokenToTime[i + 1];
                if (timestamp - time > this.tokenTTL) {
                    logger.info("delete outdated apnToken %s", token);
                    this.redis.hdel("apnTokens#" + bundleId, token);
                } else {
                    tokens.push(token.toString());
                }
            }
        } else {
            for (var token in tokenToTime) {
                var time = tokenToTime[token];
                if (timestamp - time > this.tokenTTL) {
                    logger.info("delete outdated apnToken %s", token);
                    this.redis.hdel("apnTokens#" + bundleId, token);
                } else {
                    tokens.push(token);
                }
            }
        }
        if (tokens.length > 0) {
            logger.info("send apn %s", tokens);
            apnConnection.pushNotification(note, tokens);
            this.stats.addPushTotal(tokens.length, this.type);
        }
    }
}
var hexChars = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'a', 'b', 'c', 'd', 'e', 'f'];

ApnProvider.prototype.sendAll = function (notification, timeToLive) {
    logger.info("sendAll %j", notification);
    if (!notification.apn) {
        logger.debug("no apn info skip");
        return;
    }
    var self = this;
    if (self.sliceServers) {
        var serverIndex = 0;
        hexChars.forEach(function (first) {
            hexChars.forEach(function (second) {
                var pattern = first + second + "*";
                var apiUrl = self.sliceServers[serverIndex % self.sliceServers.length];
                serverIndex++;
                request
                    .post(apiUrl + '/api/sliceSendAll')
                    .send({
                        timeToLive: timeToLive,
                        notification: JSON.stringify(notification),
                        pattern: pattern
                    })
                    .set('Accept', 'application/json')
                    .end(function (err, res) {
                        if (err || res.text != '{"code":"success"}') {
                            logger.error("slicing error %s %s %s %s", pattern, apiUrl, err, res && res.text);
                        }
                    });
            });
        });
    } else {
        var note = toApnNotification(notification, timeToLive);
        this.bundleIds.forEach(function (bundleId) {
            self.redis.hgetall("apnTokens#" + bundleId, function (err, replies) {
                if (replies) {
                    self.sendToApn(replies, bundleId, note);
                }
            });
        });
    }
};

function toApnNotification(notification, timeToLive) {
    var note = new apn.Notification();
    if (notification.apn.badge) {
        note.badge = notification.apn.badge;
    }
    if (notification.apn.alert) {
        note.alert = notification.apn.alert;
        if (notification.apn.sound) {
            note.sound = notification.apn.sound;
        } else {
            note.sound = "default";
        }
    }

    var secondsToLive;
    if (timeToLive > 0) {
        secondsToLive = Math.floor(timeToLive / 1000);
    } else {
        secondsToLive = 600;
    }
    logger.debug("note.expiry ", secondsToLive);
    note.expiry = Math.floor(Date.now() / 1000) + secondsToLive;
    if (notification.android.payload) {
        note.payload = notification.android.payload;
    } else {
        note.payload = {};
    }
    return note;
}