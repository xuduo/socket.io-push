module.exports = (apnConfigs, apnApiUrls, redis, arrivalStats, tokenTTL, tokenService) => {
    return new ApnProvider(apnConfigs, apnApiUrls, redis, arrivalStats, tokenTTL, tokenService);
};

const logger = require('winston-proxy')('ApnProvider');
const apn = require('apn');
const request = require('request');

class ApnProvider {

    constructor(apnConfigs, apnApiUrls = [], redis, arrivalStats, tokenTTL, tokenService) {
        this.redis = redis;
        this.type = "apn";
        this.apnConnections = {};
        this.arrivalStats = arrivalStats;
        this.apnApiUrls = require("../util/infiniteArray")(apnApiUrls);
        this.tokenTTL = tokenTTL;

        this.sentCallback = (result)=> {
            if (result.errorTokens) {
                logger.debug("sentCallback errorTokens", result.errorTokens, result.bundleId);
                for (const token of result.errorTokens) {
                    tokenService.delToken(this.type, token, result.bundleId);
                }
            }
            logger.debug("sentCallback ", result);
            arrivalStats.addArrivalInfo(result.id, "target_apn", result.total);
            arrivalStats.addArrivalInfo(result.id, "arrive_apn", result.success);
        };

        apnConfigs.forEach((apnConfig, index) => {
            let connection = "";
            if ((apnConfig.cert && apnConfig.key) || apnConfig.token) {
                apnConfig.maxConnections = apnConfig.maxConnections || 10;
                connection = apn.Provider(apnConfig);
                connection.index = index;
                logger.debug("load apnConfig: %j", apnConfig);
            }
            this.apnConnections[apnConfig.bundleId] = connection;
            logger.info("apnConnections init for %s maxConnections %s", apnConfig.bundleId, apnConfig.maxConnections);
        });

        this.bundleIds = Object.keys(this.apnConnections);
        this.defaultBundleId = this.bundleIds[0];
        logger.info("defaultBundleId %s", this.defaultBundleId);
    }

    sendMany(notification, apnDataList, timeToLive) {
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
    }

    batchSendToApn(notification, bundleId, tokens, timeToLive) {
        if (this.apnApiUrls.hasNext()) {
            this.callRemote(notification, bundleId, tokens, timeToLive, 0, this.sentCallback);
        } else {
            this.callLocal(notification, bundleId, tokens, timeToLive, this.sentCallback);
        }
    }

    callLocal(notification, bundleId, tokens, timeToLive, callback) {
        const apnConnection = this.apnConnections[bundleId];
        if (!apnConnection) {
            logger.error("bundleId not supported", bundleId);
            return;
        }
        if (!tokens || tokens.length == 0) {
            logger.error("tokens empty ", bundleId);
            return;
        }
        const note = this.toApnNotification(notification, timeToLive);
        note.topic = bundleId;
        logger.debug("callLocal ", bundleId, notification.id, tokens.length);
        apnConnection.send(note, tokens).then((response) => {
            let successCount = 0;
            const errorToken = [];
            let errorCount = 0;
            if (response.failed) {
                errorCount = response.failed.length;
            }
            if (response.sent && response.sent.length > 0) {
                logger.debug("send success ", bundleId, notification.id, tokens.length, errorCount);
                successCount = response.sent.length;
            }
            if (errorCount > 0) {
                for (const failed of response.failed) {
                    let error = "";
                    if (failed.response) {
                        error = failed.response.reason || "unknown";
                    }
                    if ((error == "BadDeviceToken" || error == "Unregistered" || error == "DeviceTokenNotForTopic") && failed.device) {
                        errorToken.push(failed.device);
                    }
                    logger.error("apn failed %s %s %j", notification.id, error, failed.device);
                }
            }
            callback({
                id: notification.id,
                bundleId: bundleId,
                success: successCount,
                total: tokens.length,
                errorTokens: errorToken
            });
        });
    }

    callRemote(notification, bundleId, tokens, timeToLive, errorCount = 0, callback) {
        if (!tokens || tokens.length == 0) {
            return;
        }
        const apiUrl = this.apnApiUrls.next();
        const retryCount = 2;
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
                logger.info("callRemote api batch ", tokens.length, apiUrl, error, body, notification);
                if (error && errorCount <= retryCount) {
                    logger.error("retry remote api batch ", tokens.length, errorCount, apiUrl, error, body);
                    this.callRemote(notification, bundleId, tokens, timeToLive, errorCount + 1, callback);
                } else {
                    try {
                        callback(JSON.parse(body));
                    } catch (e) {
                        logger.error("callRemote callback error ", e);
                    }
                }
            }
        );
    }

    sendAll(notification, timeToLive) {
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
    }

    toApnNotification(notification, timeToLive) {
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

}