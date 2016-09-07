module.exports = RestApi;
var express = require('express');
const logger = require('winston-proxy')('RestApi');

function RestApi(apiRouter, topicOnline, stats, config, redis, apiThreshold, apnService, apiAuth, uidStore) {

    if (!(this instanceof RestApi)) return new RestApi(apiRouter, topicOnline, stats, config, redis, apiThreshold, apnService, apiAuth, uidStore);

    const self = this;

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

    const handlePush = function (req, res, next) {
        if (self.apiAuth && !self.apiAuth("/api/push", req, logger)) {
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

        const pushIds = parseArrayParam(req.p.pushId);
        const uids = parseArrayParam(req.p.uid);

        if (!pushIds && !uids && !req.p.topic) {
            res.statusCode = 400;
            res.json({code: "error", message: "pushId or uid or topic is required"});
            return next();
        }

        if (moreThanOneTrue(pushIds, uids, req.p.topic)) {
            res.statusCode = 400;
            res.json({code: "error", message: "pushId or uid or topic can't be present at the same time"});
            return next();
        }

        if (req.p.topic) {
            apiThreshold.checkPushDrop(req.p.topic, function (call) {
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

    const handleNotification = function (req, res, next) {
        logger.info("handleNotification %j", req.p);
        if (self.apiAuth && !self.apiAuth("/api/notification", req, logger)) {
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

        const pushIds = parseArrayParam(req.p.pushId);
        const uids = parseArrayParam(req.p.uid);

        if (req.p.pushAll == 'true') {
            logger.info('handleNotification pushAll ', req.p);
        }

        if (!req.p.tag && !pushIds && !uids && req.p.pushAll != 'true') {
            res.statusCode = 400;
            res.json({code: "error", message: "pushId / uid / tag is required"});
            return next();
        }

        if (moreThanOneTrue(req.p.tag, pushIds, uids, req.p.pushAll == 'true')) {
            res.statusCode = 400;
            res.json({code: "error", message: "tag / pushId / pushAll can't be present at the same time"});
            return next();
        }

        apiRouter.notification(notification, req.p.pushAll == 'true', pushIds, uids, req.p.tag, parseInt(req.p.timeToLive));
        res.json({code: "success"});
        return next();
    };
    const handleRouteNotification = function (req, res, next) {
        const notification = JSON.parse(req.p.notification);
        const pushIds = JSON.parse(req.p.pushId);
        const timeToLive = parseInt(req.p.timeToLive);
        apiRouter.notificationLocal(notification, pushIds, timeToLive);
        res.json({code: "success"});
        return next();
    };

    const heapdump = function (req, res, next) {
        var file = process.cwd() + "/" + Date.now() + '.heapsnapshot';
        require('heapdump').writeSnapshot(file);
        res.json({code: "success", file: file});
        return next();
    };

    const handleStatsBase = function (req, res, next) {
        stats.getSessionCount(function (count) {
            res.json(count);
            return next();
        });
    };

    const handleChartStats = function (req, res, next) {
        const key = req.p.key;
        stats.find(key, function (result) {
            res.json(result);
            return next();
        });
    };

    const handleAddPushIdToUid = function (req, res, next) {
        uidStore.bindUid(req.p.pushId, req.p.uid, parseInt(req.p.timeToLive), req.p.platform, parseInt(req.p.platformLimit));
        res.json({code: "success"});
        return next();
    };

    const removeRemoveUid = function (req, res, next) {
        const pushIds = parseArrayParam(req.p.pushId);
        const uids = parseArrayParam(req.p.uid);
        if (pushIds) {
            pushIds.forEach(function (pushId) {
                uidStore.removePushId(pushId, true);
            });
            res.json({code: "success"});
        } else if (uids) {
            uids.forEach(function (uid) {
                uidStore.removeUid(uid);
            });
            res.json({code: "success"});
        } else {
            res.statusCode = 400;
            res.json({code: "error", message: "pushId or uid is required"});
            res.json({code: "success"});
        }
        return next();
    };

    const handleQueryDataKeys = function (req, res, next) {
        stats.getQueryDataKeys(function (result) {
            logger.debug("getQueryDataKeys result: " + result)
            res.json({"result": result});
            return next();
        });
    };

    const handleApn = function (req, res, next) {
        apnService.callLocal(JSON.parse(req.p.notification), req.p.bundleId, parseArrayParam(req.p.tokens), req.p.pattern);
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
    router.get('/stats/chart', handleChartStats);
    router.get('/push', handlePush);
    router.post('/push', handlePush);
    router.get('/notification', handleNotification);
    router.post('/notification', handleNotification);
    router.post('/routeNotification', handleRouteNotification);
    router.get('/uid/bind', handleAddPushIdToUid);
    router.post('/uid/bind', handleAddPushIdToUid);
    router.get('/uid/remove', removeRemoveUid);
    router.post('/uid/remove', removeRemoveUid);
    router.get('/stats/getQueryDataKeys', handleQueryDataKeys)

    router.get('/topicOnline', function (req, res, next) {
        const topic = req.p.topic;
        if (!topic) {
            res.statusCode = 400;
            res.json({code: 'error', message: 'topic is required'})
            return next();
        }
        topicOnline.getTopicOnline(topic, function (result) {
            res.json({count: result, topic: req.p.topic});
            return next();
        });
    });

    router.get('/status', function (req, res, next) {
        res.json(redis.status());
        return next();
    });

    router.get('/redis/del', function (req, res, next) {
        redis.del(req.p.key);
        res.json({code: "success", key: req.p.key});
        return next();
    });

    router.get('/redis/get', function (req, res, next) {
        redis.get(req.p.key, function (err, result) {
            res.json({key: req.p.key, value: result});
            return next();
        });
    });

    router.get('/redis/hash', function (req, res, next) {
        redis.hash(req.p.key, function (result) {
            res.json(result);
            return next();
        });
    });

    router.get('/admin/command', function (req, res, next) {
        redis.publish("adminCommand", req.p.command);
        res.json({code: "success"});
        return next();
    });

    router.get('/redis/hgetall', function (req, res, next) {
        redis.hgetall(req.p.key, function (err, result) {
            res.json({key: req.p.key, count: result.length, result: result});
            return next();
        });
    });

    router.get('/redis/hkeys', function (req, res, next) {
        redis.hkeys(req.p.key, function (err, result) {
            const strs = [];
            result.forEach(function (token) {
                strs.push(token.toString('ascii'));
            });
            res.json({key: req.p.key, count: strs.length, result: strs});
            return next();
        });
    });

    router.get('/nginx', function (req, res, next) {
        stats.getSessionCount(function (count) {
            res.writeHead(200, {
                'Content-Type': 'text/plain'
            });
            count.processCount.forEach(function (process) {
                res.write("server " + process.id + ";\n");
            });
            res.end();
            return next();
        });
    });

    router.get('/config', function (req, res, next) {
        res.json(config);
        return next();
    });

    router.get('/ip', function (req, res, next) {
        let ip = req.connection.remoteAddress;
        ip = ip.substr(ip.lastIndexOf(':') + 1, ip.length);
        res.writeHead(200, {
            'Content-Length': Buffer.byteLength(ip),
            'Content-Type': 'text/plain'
        });
        res.write(ip);
        res.end();
        return next();
    });

    const handleEcho = function (req, res, next) {
        res.json(req.p);
        return next();
    };

    router.get('/echo', handleEcho);
    router.post('/echo', handleEcho);

}

RestApi.prototype.close = function () {
    this.server.close();
};

function moreThanOneTrue() {
    let count = 0;
    for (const item of arguments) {
        if (item) {
            count++;
        }
    }
    return count > 1;
}

function parseArrayParam(param) {
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