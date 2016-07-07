module.exports = ApnProvider;

const logger = require('../log/index.js')('ApnProvider');

const util = require('../util/util.js');
const apn = require('apn');
const request = require('superagent');

function ApnProvider(apnConfigs, sliceServers, redis, stats, tokenTTL) {
    if (!(this instanceof ApnProvider)) return new ApnProvider(apnConfigs, sliceServers, redis, stats, tokenTTL);
    this.redis = redis;
    this.type = "apn";
    this.apnConnections = {};
    this.stats = stats;
    this.tokenTTL = tokenTTL;
    this.sliceServers = sliceServers;
    const self = this;
    const fs = require('fs');
    const ca = [fs.readFileSync(__dirname + "/../../cert/entrust_2048_ca.cer")];

    apnConfigs.forEach(function (apnConfig, index) {
        apnConfig.maxConnections = apnConfig.maxConnections || 10;
        apnConfig.ca = ca;
        apnConfig.errorCallback = function (errorCode, notification, device) {
            if (device && device.token) {
                const id = device.token.toString('hex');
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
        const connection = apn.Connection(apnConfig);
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
    
    const mapApnToken = {};
    for(const apnData of apnDataList){
        bundleId = apnData.bundleId;
        apnList = mapApnToken[bundleId] || [];
        apnList.push(apnData.token);
        mapApnToken[bundleId] = apnList;
    }

    for(const bundle in mapApnToken){
        const apnConnection = this.apnConnections[bundle];
        if(apnConnection){
            this.stats.addPushTotal(1, this.type);
            const note = toApnNotification(notification, timeToLive);
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
    const self = this;
    const note = toApnNotification(notification, timeToLive);
    this.bundleIds.forEach(function (bundleId) {
        self.redis.hscan("apnTokens#" + bundleId, "0", "MATCH", pattern, "COUNT", 10000000, function (err, replies) {
            if (replies.length == 2) {
                self.sendToApn(replies[1], bundleId, note);
            }
        });
    });
};

ApnProvider.prototype.sendToApn = function (tokenToTime, bundleId, note) {
    const apnConnection = this.apnConnections[bundleId];
    const timestamp = Date.now();
    if (tokenToTime) {
        const tokens = [];
        if (Array.isArray(tokenToTime)) {
            for (let i = 0; i + 1 < tokenToTime.length; i = i + 2) {
                const token = tokenToTime[i];
                const time = tokenToTime[i + 1];
                if (timestamp - time > this.tokenTTL) {
                    logger.info("delete outdated apnToken %s", token);
                    this.redis.hdel("apnTokens#" + bundleId, token);
                } else {
                    tokens.push(token.toString());
                }
            }
        } else {
            for (const token in tokenToTime) {
                const time = tokenToTime[token];
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
const hexChars = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'a', 'b', 'c', 'd', 'e', 'f'];

ApnProvider.prototype.sendAll = function (notification, timeToLive) {
    logger.info("sendAll %j", notification);
    if (!notification.apn) {
        logger.debug("no apn info skip");
        return;
    }
    const self = this;
    if (self.sliceServers) {
        let serverIndex = 0;
        hexChars.forEach(function (first) {
            hexChars.forEach(function (second) {
                const pattern = first + second + "*";
                const apiUrl = self.sliceServers[serverIndex % self.sliceServers.length];
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
        const note = toApnNotification(notification, timeToLive);
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
    const note = new apn.Notification();
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

    let secondsToLive;
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