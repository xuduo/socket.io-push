module.exports = RestApi;
var restify = require('restify');
var logger = require('../log/index.js')('RestApi');

function RestApi(apiRouter, topicOnline, stats, config, redis, apiThreshold, apnService, apiAuth, uidStore) {

    if (!(this instanceof RestApi)) return new RestApi(apiRouter, topicOnline, stats, config, redis, apiThreshold, apnService, apiAuth, uidStore);

    var self = this;

    this.apiAuth = apiAuth;
    this.apiRouter = apiRouter;

    var server = restify.createServer();

    this.server = server;

    server.on('uncaughtException', function (req, res, route, err) {
        try {
            logger.error("RestApi uncaughtException " + err.stack + " \n params: \n" + JSON.stringify(req.params));
            res.statusCode = 500;
            res.send({code: "error", message: "exception " + err.stack});
        } catch (err) {
            logger.error("RestApi uncaughtException catch " + err.stack);
        }
    });

    server.use(restify.acceptParser(server.acceptable));
    server.use(restify.queryParser());
    server.use(restify.bodyParser());

    var staticConfig = restify.serveStatic({
        directory: __dirname + '/../../static',
        default: 'index.html'
    });

    server.get(/^\/push\/?.*/, staticConfig);

    server.get(/^\/client\/?.*/, staticConfig);

    server.get(/^\/notification\/?.*/, staticConfig);

    server.get(/^\/uid\/?.*/, staticConfig);

    server.get(/^\/handleStatsBase\/?.*/, staticConfig);

    server.get(/^\/stats\/?.*/, staticConfig);

    server.get(/^\/js\/?.*/, staticConfig);

    server.get("/", staticConfig);

    var handlePush = function (req, res, next) {
        if (self.apiAuth && !self.apiAuth("/api/push", req, logger)) {
            logger.error("push denied %j %j", req.params, req.headers);
            res.statusCode = 400;
            res.send({code: "error", message: 'not authorized'});
            return next();
        }

        if (!req.params.topic && !req.params.pushId && !req.params.uid) {
            res.statusCode = 400;
            res.send({code: "error", message: 'topic or pushId or uid is required'});
            return next();
        }

        var data = req.params.data;
        var json = req.params.json;
        if (!data && !json) {
            res.statusCode = 400;
            res.send({code: "error", message: 'data is required'});
            return next();
        }
        logger.debug("push %j", req.params);
        var pushData = {};
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

        var pushIds = parseArrayParam(req.params.pushId);
        var uids = parseArrayParam(req.params.uid);

        if (!req.params.pushId && !req.params.uid && !req.params.topic) {
            res.statusCode = 400;
            res.send({code: "error", message: "pushId or uid is required"});
            return next();
        }

        if (req.params.topic) {
            apiThreshold.checkPushDrop(req.params.topic, function (call) {
                if (!call) {
                    res.statusCode = 400;
                    res.send({code: "error", message: "call threshold exceeded"});
                    return next();
                }
            });
        }

        apiRouter.push(pushData, req.params.topic, pushIds, uids, parseInt(req.params.timeToLive));
        res.send({code: "success"});
        return next();
    };

    var handleNotification = function (req, res, next) {
        if (self.apiAuth && !self.apiAuth("/api/notification", req, logger)) {
            logger.error("notification denied %j %j", req.params, req.headers);
            res.statusCode = 400;
            res.send({code: "error", message: 'not authorized'});
            return next();
        }

        var notification = JSON.parse(req.params.notification);
        if (!notification) {
            res.statusCode = 400;
            res.send({code: "error", message: 'notification is required'});
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

        logger.debug("notification ", req.params);

        var pushIds = parseArrayParam(req.params.pushId);
        var uids = parseArrayParam(req.params.uid);

        if (req.params.pushAll == 'true') {
            logger.info('notification pushAll ', req.params);
        }

        if (!req.params.tag && !req.params.pushId && req.params.pushAll != 'true') {
            res.statusCode = 400;
            res.send({code: "error", message: "pushId / uid / tag is required"});
            return next();
        }
        apiRouter.notification(notification, req.params.pushAll == 'true', pushIds, uids, req.params.tag, parseInt(req.params.timeToLive));
        res.send({code: "success"});
        return next();
    };

    var handleStatsBase = function (req, res, next) {
        stats.getSessionCount(function (count) {
            res.send(count);
        });
        return next();
    };

    var handleChartStats = function (req, res, next) {
        var key = req.params.key;
        stats.find(key, function (result) {
            res.send(result);
        });
        return next();
    };

    var handleAddPushIdToUid = function (req, res, next) {
        uidStore.bindUid(req.params.pushId, req.params.uid, parseInt(req.params.timeToLive), req.params.platform, parseInt(req.params.platformLimit));
        res.send({code: "success"});
        return next();
    };

    var removeRemoveUid = function (req, res, next) {
        var pushId = req.params.pushId;
        if (pushId) {
            uidStore.removePushId(pushId, true);
        }
        res.send({code: "success"});
        return next();
    };

    var handleQueryDataKeys = function (req, res, next) {
        stats.getQueryDataKeys(function (result) {
            logger.debug("getQueryDataKeys result: " + result)
            res.send({"result": result});
        });
        return next();
    }

    var handleApnSlice = function (req, res, next) {
        apnService.sliceSendAll(JSON.parse(req.params.notification), req.params.timeToLive, req.params.pattern);
        res.send({code: "success"});
        return next();
    }

    server.get('/api/sliceSendAll', handleApnSlice);
    server.post('/api/sliceSendAll', handleApnSlice);
    server.get('/api/stats/base', handleStatsBase);
    server.get('/api/stats/chart', handleChartStats);
    server.get('/api/push', handlePush);
    server.post('/api/push', handlePush);
    server.get('/api/notification', handleNotification);
    server.post('/api/notification', handleNotification);
    server.get('/api/uid/bind', handleAddPushIdToUid);
    server.post('/api/uid/bind', handleAddPushIdToUid);
    server.get('/api/uid/remove', removeRemoveUid);
    server.post('/api/uid/remove', removeRemoveUid);
    server.get('api/state/getQueryDataKeys', handleQueryDataKeys)

    server.get('/api/topicOnline', function (req, res, next) {
        if (!topicOnline) {
            res.statusCode = 400;
            res.send({code: 'error', message: 'topicOnline not configured'});
            return next();
        }
        var topic = req.params.topic;
        if (!topic) {
            res.statusCode = 400;
            res.send({code: 'error', message: 'topic is required'})
            return next();
        }
        topicOnline.getTopicOnline(topic, function (result) {
            res.send({count: result, topic: req.params.topic});
        });
        return next();
    });

    server.get('/api/status', function (req, res, next) {
        res.send(redis.status());
        return next();
    });

    server.get('/api/redis/del', function (req, res, next) {
        redis.del(req.params.key);
        res.send({code: "success", key: req.params.key});
        return next();
    });

    server.get('/api/redis/get', function (req, res, next) {
        redis.get(req.params.key, function (err, result) {
            res.send({key: req.params.key, value: result});
        });
        return next();
    });

    server.get('/api/redis/hash', function (req, res, next) {
        redis.hash(req.params.key, function (result) {
            res.send(result);
        });
        return next();
    });


    server.get('/api/admin/command', function (req, res, next) {
        redis.publish("adminCommand", req.params.command);
        res.send({code: "success"});
        return next();
    });

    server.get('/api/redis/hgetall', function (req, res, next) {
        redis.hgetall(req.params.key, function (err, result) {
            res.send({key: req.params.key, count: result.length, result: result});
        });
        return next();
    });

    server.get('/api/redis/hkeys', function (req, res, next) {
        redis.hkeys(req.params.key, function (err, result) {
            var strs = [];
            result.forEach(function (token) {
                strs.push(token.toString('ascii'));
            });
            res.send({key: req.params.key, count: strs.length, result: strs});
        });
        return next();
    });

    server.get('/api/nginx', function (req, res, next) {
        stats.getSessionCount(function (count) {
            res.writeHead(200, {
                'Content-Type': 'text/plain'
            });
            count.processCount.forEach(function (process) {
                res.write("server " + process.id + ";\n");
            });
            res.end();
        });
        return next();
    });

    server.get('/api/config', function (req, res, next) {
        res.send(config);
        return next();
    });

    server.get('/api/ip', function (req, res, next) {
        var ip = req.connection.remoteAddress;
        ip = ip.substr(ip.lastIndexOf(':') + 1, ip.length);
        res.writeHead(200, {
            'Content-Length': Buffer.byteLength(ip),
            'Content-Type': 'text/plain'
        });
        res.write(ip);
        res.end();
        return next();
    });

    var handleEcho = function (req, res, next) {
        res.send(req.params);
        return next();
    };

    server.get('/api/echo', handleEcho);
    server.post('/api/echo', handleEcho);

    server.listen(config.api_port, function () {
        logger.debug('%s listening at %s', server.name, server.url);
    });

}

RestApi.prototype.close = function () {
    this.server.close();
};

function parseArrayParam(param) {
    var arr;
    if (typeof param === 'string') {
        if (param.startsWith('[')) {
            arr = JSON.parse(param);
        } else {
            arr = [param];
        }
    } else if (typeof param === 'number') {
        arr = [param];
    }
    else {
        arr = param;
    }
    return arr;
}
