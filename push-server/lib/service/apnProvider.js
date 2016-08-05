module.exports = ApnProvider;

const logger = require('winston-proxy')('ApnProvider');
const apn = require('apn');
const request = require('request');

function ApnProvider(apnConfigs, apnApiUrls = [], redis, stats, tokenTTL) {
    if (!(this instanceof ApnProvider)) return new ApnProvider(apnConfigs, apnApiUrls, redis, stats, tokenTTL);
    this.redis = redis;
    this.type = "apn";
    this.apnConnections = {};
    this.stats = stats;
    this.apnApiUrls = require("../util/infiniteArray")(apnApiUrls);
    this.tokenTTL = tokenTTL;
    const self = this;
    const fs = require('fs');
    const ca = [fs.readFileSync(__dirname + "/../../cert/entrust_2048_ca.cer")];

    apnConfigs.forEach(function (apnConfig, index) {
        let connection = "";
        if (apnConfig.cert && apnConfig.key) {
            apnConfig.maxConnections = apnConfig.maxConnections || 10;
            apnConfig.ca = ca;
            apnConfig.errorCallback = function (errorCode, notification, device) {
                if (device && device.token) {
                    const id = device.token.toString('hex');
                    logger.error("apn errorCallback errorCode %d %s", errorCode, id);
                    stats.addPushError(1, errorCode, self.type);
                    if (errorCode == 8) {
                        redis.hdel("apnTokens#" + apnConfig.bundleId, id);
                        redis.get("tokenToPushId#apn#" + id, function (err, oldPushId) {
                            logger.error("apn errorCallback pushId %s", oldPushId);
                            if (oldPushId) {
                                redis.del("pushIdToToken#" + oldPushId);
                                redis.del("tokenToPushId#apn#" + id);
                            }
                        });
                    }
                } else {
                    logger.error("apn errorCallback no token %s %j", errorCode, device);
                }
            }
            connection = apn.Connection(apnConfig);
            connection.index = index;
            connection.on("transmitted", function () {
                stats.addPushSuccess(1, self.type);
            });
        }
        self.apnConnections[apnConfig.bundleId] = connection;
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
    for (const apnData of apnDataList) {
        const bundleId = apnData.bundleId;
        const apnList = mapApnToken[bundleId] || [];
        apnList.push(apnData.token);
        mapApnToken[bundleId] = apnList;
    }

    for (const bundle in mapApnToken) {
        logger.debug("send notification to ios %s", bundle);
        this.batchSendToApn(notification, bundle, mapApnToken[bundle], timeToLive);
    }
};

ApnProvider.prototype.batchSendToApn = function (notification, bundleId, tokens, timeToLive) {
    if (this.apnApiUrls.hasNext()) {
        this.callRemote(notification, bundleId, tokens, timeToLive);
    } else {
        this.callLocal(notification, bundleId, tokens, timeToLive);
    }
};

ApnProvider.prototype.callLocal = function (notification, bundleId, tokens, timeToLive) {
    const apnConnection = this.apnConnections[bundleId];
    if (!apnConnection) {
        logger.error("bundleId not supported", bundleId);
        return;
    }
    if (!tokens || tokens.length == 0) {
        logger.error("tokens empty ", bundleId);
        return;
    }
    this.stats.addPushTotal(tokens.length, this.type);
    const note = toApnNotification(notification, timeToLive);
    apnConnection.pushNotification(note, tokens);
    logger.debug("send to notification to ios %s %j", bundleId, tokens);
};

ApnProvider.prototype.callRemote = function (notification, bundleId, tokens, timeToLive, errorCount = 0) {
    const apiUrl = this.apnApiUrls.next();
    const retryCount = 1;
    request({
            url: apiUrl + "/api/apn",
            method: "post",
            form: {
                bundleId: bundleId,
                tokens: JSON.stringify(tokens),
                notification: JSON.stringify(notification),
                timeToLive: timeToLive
            }
        }, (error, response, body) => {
            logger.debug("call remote api batch ", tokens.length, apiUrl, error, body);
            if (error && errorCount <= retryCount) {
                logger.error("retry remote api batch ", tokens.length, apiUrl, error, body);
                this.callRemote(notification, bundleId, tokens, timeToLive, errorCount + 1);
            }
        }
    );
};

ApnProvider.prototype.sendAll = function (notification, timeToLive) {
    logger.info("sendAll %j", notification);
    if (!notification.apn) {
        logger.debug("no apn info skip");
        return;
    }
    for (const bundleId of this.bundleIds) {
        const stream = this.redis.hscanStream("apnTokens#" + bundleId, {count: 1000});
        let batch = [];
        const timestamp = Date.now();
        stream.on('data', result => {
                for (let i = 0; i + 1 < result.length; i = i + 2) {
                    const token = result[i];
                    batch.push(token);
                    const time = result[i + 1];
                    if (timestamp - time > this.tokenTTL) {
                        logger.debug("delete outdated apnToken %s", token);
                        this.redis.hdel("apnTokens#" + bundleId, token);
                    }
                }
                this.batchSendToApn(notification, bundleId, batch, timeToLive);
                batch = [];
            }
        );
        stream.on('end', () => {
            this.batchSendToApn(notification, bundleId, batch, timeToLive);
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