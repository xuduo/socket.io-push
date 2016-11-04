module.exports = (apiRouter, topicOnline, stats, config, redis, apiThreshold, apnService, apiAuth, uidStore, onlineStats, arrivalStats) => {
    return new RestApi(apiRouter, topicOnline, stats, config, redis, apiThreshold, apnService, apiAuth, uidStore, onlineStats, arrivalStats);
};
const express = require('express');
const logger = require('winston-proxy')('RestApi');

class RestApi {

    constructor(apiRouter, topicOnline, stats, config, redis, apiThreshold, apnService, apiAuth, uidStore, onlineStats, arrivalStats) {
        this.apiAuth = apiAuth;
        this.apiRouter = apiRouter;

        const app = express();
        var bodyParser = require('body-parser');
        app.use("/api", bodyParser.urlencoded({     // to support URL-encoded bodies
            extended: true
        }));
        app.use("/api", bodyParser.json());
        app.use("/api", (req, res, next) => {
            req.p = {};
            for (const param in req.body) {
                req.p[param] = req.body[param];
            }
            for (const param in req.query) {
                req.p[param] = req.query[param];
            }
            res.set("Access-Control-Allow-Origin", "*");
            return next();
        });


        this.server = app.listen(config.port);

        const handlePush = (req, res, next) => {
            if (this.apiAuth && !this.apiAuth("/api/push", req, logger)) {
                logger.error("push denied %j %j", req.p, req.headers);
                res.statusCode = 400;
                res.json({code: "error", message: 'not authorized'});
                return next();
            }

            if (!req.p.topic && !req.p.pushId && !req.p.uid) {
                res.statusCode = 400;
                res.json({code: "error", message: 'topic or pushId or uid is required'});
                return next();
            }

            const data = req.p.data;
            const json = req.p.json;
            if (!data && !json) {
                res.statusCode = 400;
                res.json({code: "error", message: 'data is required'});
                return next();
            }
            logger.info("handlePush %j", req.p);
            const pushData = {};
            if (data) {
                pushData.data = data;
            }
            if (json) {
                try {
                    pushData.j = JSON.parse(json);
                } catch (err) {
                    pushData.j = json;
                }
            }

            const pushIds = this.parseArrayParam(req.p.pushId);
            const uids = this.parseArrayParam(req.p.uid);

            if (!pushIds && !uids && !req.p.topic) {
                res.statusCode = 400;
                res.json({code: "error", message: "pushId or uid or topic is required"});
                return next();
            }

            if (this.moreThanOneTrue(pushIds, uids, req.p.topic)) {
                res.statusCode = 400;
                res.json({code: "error", message: "pushId or uid or topic can't be present at the same time"});
                return next();
            }

            if (req.p.topic) {
                apiThreshold.checkPushDrop(req.p.topic, (call) => {
                    if (!call) {
                        res.statusCode = 400;
                        res.json({code: "error", message: "call threshold exceeded"});
                        return next();
                    }
                });
            }

            apiRouter.push(pushData, req.p.topic, pushIds, uids, parseInt(req.p.timeToLive));
            res.json({code: "success"});
            return next();
        };

        const handleNotification = (req, res, next) => {
            logger.info("handleNotification %j", req.p);
            if (this.apiAuth && !this.apiAuth("/api/notification", req, logger)) {
                logger.error("notification denied %j %j", req.p, req.headers);
                res.statusCode = 400;
                res.json({code: "error", message: 'not authorized'});
                return next();
            }
            if (!req.p.notification) {
                res.statusCode = 400;
                res.json({code: "error", message: 'notification is required'});
                return next();
            }

            let notification;
            try {
                notification = JSON.parse(req.p.notification);
            } catch (err) {
                logger.error("notification parse json error ", req.p.notification, err);
                res.statusCode = 400;
                res.json({code: "error", message: 'notification format error ' + err + " " + req.p.notification});
                return next();
            }

            if (!notification.android) {
                notification.android = {};
            }
            if (notification.payload) {
                notification.android.payload = notification.payload;
                delete notification.payload;
            }

            if (!notification.android.payload) {
                notification.android.payload = {};
            }

            if (notification.apn && notification.apn.payload) {
                delete notification.apn.payload;
            }

            const pushIds = this.parseArrayParam(req.p.pushId);
            const uids = this.parseArrayParam(req.p.uid);

            if (req.p.pushAll == 'true') {
                logger.info('handleNotification pushAll ', req.p);
            }

            if (!req.p.tag && !pushIds && !uids && req.p.pushAll != 'true') {
                res.statusCode = 400;
                res.json({code: "error", message: "pushId / uid / tag is required"});
                return next();
            }

            if (this.moreThanOneTrue(req.p.tag, pushIds, uids, req.p.pushAll == 'true')) {
                res.statusCode = 400;
                res.json({code: "error", message: "tag / pushId / pushAll can't be present at the same time"});
                return next();
            }

            apiRouter.notification(notification, req.p.pushAll == 'true', pushIds, uids, req.p.tag, parseInt(req.p.timeToLive));
            res.json({code: "success"});
            return next();
        };

        const handleRouteNotification = (req, res, next) => {
            const notification = JSON.parse(req.p.notification);
            const pushIds = JSON.parse(req.p.pushId);
            const timeToLive = parseInt(req.p.timeToLive);
            apiRouter.notificationLocal(notification, pushIds, timeToLive);
            res.json({code: "success"});
            return next();
        };

        const heapdump = (req, res, next) => {
            var file = process.cwd() + "/" + Date.now() + '.heapsnapshot';
            require('heapdump').writeSnapshot(file);
            res.json({code: "success", file: file});
            return next();
        };

        const handleStatsBase = (req, res, next) => {
            stats.getSessionCount((count) => {
                res.json(count);
                return next();
            });
        };

        const handleChartStats = (req, res, next) => {
            const key = req.p.key;
            stats.find(key, (result) => {
                res.json(result);
                return next();
            });
        };

        const handleArrivalRate = (req, res, next) => {
            arrivalStats.getArrivalRateStatus((result) => {
                res.json(result);
                return next();
            });
        };

        const handleAddPushIdToUid = (req, res, next) => {
            uidStore.bindUid(req.p.pushId, req.p.uid, parseInt(req.p.timeToLive), req.p.platform, parseInt(req.p.platformLimit));
            res.json({code: "success"});
            return next();
        };

        const removeRemoveUid = (req, res, next) => {
            const pushIds = this.parseArrayParam(req.p.pushId);
            const uids = this.parseArrayParam(req.p.uid);
            if (pushIds) {
                pushIds.forEach((pushId) => {
                    uidStore.removePushId(pushId, true);
                });
                res.json({code: "success"});
            } else if (uids) {
                uids.forEach((uid) => {
                    uidStore.removeUid(uid);
                });
                res.json({code: "success"});
            } else {
                res.statusCode = 400;
                res.json({code: "error", message: "pushId or uid is required"});
            }
            return next();
        };

        const handleQueryDataKeys = (req, res, next) => {
            stats.getQueryDataKeys((result) => {
                logger.debug("getQueryDataKeys result: " + result)
                res.json({"result": result});
                return next();
            });
        };

        const handleApn = (req, res, next) => {
            apnService.callLocal(JSON.parse(req.p.notification), req.p.bundleId, this.parseArrayParam(req.p.tokens), req.p.pattern);
            res.json({code: "success"});
            return next();
        };

        const handleStatsOnlineJob = (req, res, next) => {
            onlineStats.write(parseInt(req.p.interval));
            res.json({code: "success"});
            return next();
        };

        const router = express.Router();
        app.use("/api", router);

        router.get('/heapdump', heapdump);
        router.post('/heapdump', heapdump);
        router.get('/apn', handleApn);
        router.post('/apn', handleApn);
        router.get('/stats/base', handleStatsBase);
        router.post('/stats/onlineJob', handleStatsOnlineJob);
        router.get('/stats/chart', handleChartStats);
        router.get('/stats/arrivalRate', handleArrivalRate);
        router.get('/push', handlePush);
        router.post('/push', handlePush);
        router.get('/notification', handleNotification);
        router.post('/notification', handleNotification);
        router.post('/routeNotification', handleRouteNotification);
        router.get('/uid/bind', handleAddPushIdToUid);
        router.post('/uid/bind', handleAddPushIdToUid);
        router.get('/uid/remove', removeRemoveUid);
        router.post('/uid/remove', removeRemoveUid);
        router.get('/stats/getQueryDataKeys', handleQueryDataKeys);

        router.get('/topicOnline', (req, res, next) => {
            const topic = req.p.topic;
            if (!topic) {
                res.statusCode = 400;
                res.json({code: 'error', message: 'topic is required'})
                return next();
            }
            topicOnline.getTopicOnline(topic, (result) => {
                res.json({count: result, topic: req.p.topic});
                return next();
            });
        });

        router.get('/topicDevices', (req, res, next) => {
            const topic = req.p.topic;
            if (!topic) {
                res.statusCode = 400;
                res.json({code: 'error', message: 'topic is required'})
                return next();
            }
            topicOnline.getTopicDevices(topic, (result) => {
                res.json(result);
                return next();
            });
        });

        router.get('/redis/del', (req, res, next) => {
            redis.del(req.p.key);
            res.json({code: "success", key: req.p.key});
            return next();
        });

        router.get('/redis/get', (req, res, next) => {
            redis.get(req.p.key, (err, result) => {
                res.json({key: req.p.key, value: result});
                return next();
            });
        });

        router.get('/redis/hash', (req, res, next) => {
            redis.hash(req.p.key, (result) => {
                res.json(result);
                return next();
            });
        });

        router.get('/redis/hgetall', (req, res, next) => {
            redis.hgetall(req.p.key, (err, result) => {
                res.json({key: req.p.key, count: Object.keys(result).length, result: result});
                return next();
            });
        });

        router.get('/redis/hkeys', (req, res, next) => {
            redis.hkeys(req.p.key, (err, result) => {
                const strs = [];
                result.forEach((token) => {
                    strs.push(token.toString('ascii'));
                });
                res.json({key: req.p.key, count: strs.length, result: strs});
                return next();
            });
        });

        router.get('/config', (req, res, next) => {
            res.json(config);
            return next();
        });
    }

    close() {
        this.server.close();
    }

    moreThanOneTrue() {
        let count = 0;
        for (const item of arguments) {
            if (item) {
                count++;
            }
        }
        return count > 1;
    }

    parseArrayParam(param) {
        let arr;
        if (typeof param === 'string') {
            if (param.startsWith('[')) {
                arr = JSON.parse(param);
            } else if (param) {
                arr = [param];
            }
        } else if (typeof param === 'number') {
            arr = [param];
        } else {
            arr = param;
        }
        return arr;
    }
}