module.exports = (httpServer, spdyServer, apiRouter, topicOnline, stats, config, apnService, apiAuth, deviceService, arrivalStats) => {
  return new RestApi(httpServer, spdyServer, apiRouter, topicOnline, stats, config, apnService, apiAuth, deviceService, arrivalStats);
};
const express = require('express');
const logger = require('winston-proxy')('RestApi');
const async = require('async');
const request = require('request');
const bodyParser = require('body-parser');
const paramParser = require('../util/paramParser');

class RestApi {

  constructor(httpServer, spdyServer, apiRouter, topicOnline, stats, config, apnService, apiAuth = (opts, callback) => {
    callback(true)
  }, deviceService, arrivalStats) {
    this.apiAuth = apiAuth;
    this.apiRouter = apiRouter;

    const app = express();
    app.disable('etag');

    app.use("/api", bodyParser.urlencoded({ // to support URL-encoded bodies
      extended: true,
      limit: '100mb'
    }));
    app.use("/api", bodyParser.json({
      limit: '100mb'
    }));
    app.use("/api", (req, res, next) => {
      res.set("Access-Control-Allow-Origin", "*");
      stats.addApiCall(req.path);
      req.p = {};
      for (const param in req.body) {
        req.p[param] = req.body[param];
      }
      for (const param in req.query) {
        req.p[param] = req.query[param];
      }

      this.apiAuth({
        req,
        logger,
        request
      }, (pass, message) => {
        if (!pass) {
          logger.error("api denied ", req.path, req.connection.remoteAddress);
          res.status(401).json({
            code: "error",
            message: message || 'apiAuth check fail'
          });
          next(new Error('api denied  '));
        } else {
          next();
        }
      });
    });

    if (httpServer) {
      this.httpServer = httpServer;
      httpServer.on('request', app);
    }
    if (spdyServer) {
      this.spdyServer = spdyServer;
      spdyServer.on('request', app);
    }
    const router = express.Router();
    app.use("/api", router);

    router.all('/push', (req, res, next) => {
      if (!req.p.topic && !req.p.pushId && !req.p.uid) {
        res.statusCode = 400;
        res.json({
          code: "error",
          message: 'topic or pushId or uid is required'
        });
        return next();
      }

      const data = req.p.data;
      const json = req.p.json;
      if (!data && !json) {
        res.statusCode = 400;
        res.json({
          code: "error",
          message: 'data is required'
        });
        return next();
      }

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

      const pushIds = paramParser.parseArrayParam(req.p.pushId);
      const uids = paramParser.parseArrayParam(req.p.uid);

      if (!pushIds && !uids && !req.p.topic) {
        res.statusCode = 400;
        res.json({
          code: "error",
          message: "pushId or uid or topic is required"
        });
        return next();
      }

      if (paramParser.moreThanOneTrue(pushIds, uids, req.p.topic)) {
        res.statusCode = 400;
        res.json({
          code: "error",
          message: "pushId or uid or topic can't be present at the same time"
        });
        return next();
      }

      logger.info("handlePush %j topic:%s, uids:%s, pushIds:%s", pushData, req.p.topic, getLimitedArrayToLog(uids), getLimitedArrayToLog(pushIds));

      apiRouter.push(pushData, req.p.topic, pushIds, uids, paramParser.parseNumber(req.p.timeToLive));
      res.json({
        code: "success"
      });
      return next();

    });

    router.all('/notification', (req, res, next) => {

      if (!req.p.notification) {
        res.statusCode = 400;
        res.json({
          code: "error",
          message: 'notification is required'
        });
        return next();
      }

      let params = {
        tagStart: req.p.tagStart,
        tagLessThan: req.p.tagLessThan,
        tagGreaterThan: req.p.tagGreaterThan,
        timeToLive: paramParser.parseNumber(req.p.timeToLive),
        tag: req.p.tag,
        type: req.p.type
      };

      if (typeof req.p.notification == "string") {
        try {
          params.notification = JSON.parse(req.p.notification);
        } catch (err) {
          logger.error("notification parse json error ", req.p.notification, err);
          res.statusCode = 400;
          res.json({
            code: "error",
            message: 'notification format error ' + err + " " + req.p.notification
          });
          return next();
        }
      } else {
        params.notification = req.p.notification;
      }

      if (!params.notification.android) {
        params.notification.android = {};
      }

      if (params.notification.payload) {
        params.notification.android.payload = params.notification.payload;
        delete params.notification.payload;
      }

      if (!params.notification.android.payload) {
        params.notification.android.payload = {};
      }

      if (params.notification.apn && params.notification.apn.payload) {
        delete params.notification.apn.payload;
      }

      params.pushIds = paramParser.parseArrayParam(req.p.pushId);
      params.uids = paramParser.parseArrayParam(req.p.uid);

      if (req.p.pushAll === 'true') {
        params.pushAll = true;
        logger.info('handleNotification pushAll ', req.p);
      }

      if (!req.p.tag && !params.pushIds && !params.uids && req.p.pushAll != 'true') {
        res.statusCode = 400;
        res.json({
          code: "error",
          message: "pushId / uid / tag is required"
        });
        return next();
      }

      if (paramParser.moreThanOneTrue(req.p.tag, params.pushIds, params.uids, req.p.pushAll == 'true')) {
        res.statusCode = 400;
        res.json({
          code: "error",
          message: "tag / pushId / pushAll can't be present at the same time"
        });
        return next();
      }

      params.remoteAddress = req.connection.remoteAddress;

      const id = apiRouter.notification(params);

      logger.info("handleNotification %s id: %s ,tag:%s,pushAll:%s,uids:%s, pushIds:%s, %j", req.connection.remoteAddress, id, params.tag, params.pushAll, getLimitedArrayToLog(params.uids), getLimitedArrayToLog(params.pushIds), params.notification);

      res.json({
        code: "success",
        id: id
      });
      return next();
    });

    router.all('/heapdump', (req, res, next) => {
      var file = process.cwd() + "/" + Date.now() + '.heapsnapshot';
      require('heapdump').writeSnapshot(file);
      res.json({
        code: "success",
        file: file
      });
      return next();
    });

    router.all('/heap', (req, res, next) => {
      const v8 = require('v8');
      res.json({
        code: "success",
        heapStatistics: v8.getHeapStatistics(),
        heapSpaceStatistics: v8.getHeapSpaceStatistics()
      });
      return next();
    });

    router.all('/stats/base', (req, res, next) => {
      stats.getSessionCount((count) => {
        res.json(count);
        return next();
      });
    });

    router.all('/stats/chart', (req, res, next) => {
      const key = req.p.key;
      stats.find(key, (result) => {
        res.json(result);
        return next();
      });
    });

    router.all('/stats/arrival/:type', (req, res, next) => {
      const packetId = req.p.id;
      const uid = req.p.uid;
      const pushId = req.p.pushId;
      if (packetId) {
        arrivalStats.getArrivalInfo(packetId, (packet) => {
          res.json(packet);
          return next();
        });
      } else if (uid) {
        arrivalStats.getRateStatusByUid(uid, (result) => {
          res.json(result);
          return next();
        });
      } else if (pushId) {
        arrivalStats.getRateStatusByDevice(pushId, (result) => {
          res.json(result);
          return next();
        });
      } else {
        arrivalStats.getRateStatusByType(req.params.type, (result) => {
          res.json(result);
          return next();
        });
      }
    });

    router.all('/uid/bind', (req, res, next) => {
      deviceService.bindUid(req.p.pushId, req.p.uid, req.p.platform, paramParser.parseNumber(req.p.platformLimit));
      deviceService.publishBindUid(req.p.pushId, req.p.uid);
      res.json({
        code: "success"
      });
      return next();
    });

    router.all('/uid/remove', (req, res, next) => {
      const pushIds = paramParser.parseArrayParam(req.p.pushId);
      const uids = paramParser.parseArrayParam(req.p.uid);
      if (pushIds) {
        pushIds.forEach((pushId) => {
          deviceService.removePushId(pushId, true);
          deviceService.publishUnbindUid(pushId, null);
        });
        res.json({
          code: "success"
        });
      } else if (uids) {
        uids.forEach((uid) => {
          deviceService.removeUid(uid);
          deviceService.publishUnbindUid(null, uid);
        });
        res.json({
          code: "success"
        });
      } else {
        res.statusCode = 400;
        res.json({
          code: "error",
          message: "pushId or uid is required"
        });
      }
      return next();
    });

    router.all('/stats/getQueryDataKeys', (req, res, next) => {
      stats.getQueryDataKeys((result) => {
        logger.debug("getQueryDataKeys result: " + result)
        res.json({
          "result": result
        });
        return next();
      });
    });

    router.all('/apn', (req, res, next) => {
      apnService.callLocal(JSON.parse(req.p.notification), req.p.bundleId, paramParser.parseArrayParam(req.p.tokens), req.p.pattern, (result) => {
        result.code = "success";
        res.json(result);
        return next();
      });
    });

    router.all('/topicOnline', (req, res, next) => {
      const topic = req.p.topic;
      if (!topic) {
        res.statusCode = 400;
        res.json({
          code: 'error',
          message: 'topic is required'
        })
        return next();
      }
      topicOnline.getTopicOnline(topic, (result) => {
        res.json({
          count: result,
          topic: req.p.topic
        });
        return next();
      });
    });

    router.all('/topicDevices', (req, res, next) => {
      const topic = req.p.topic;
      if (!topic) {
        res.statusCode = 400;
        res.json({
          code: 'error',
          message: 'topic is required'
        })
        return next();
      }
      topicOnline.getTopicDevices(topic, (result) => {
        res.json(result);
        return next();
      });
    });

    const handleQueryDevice = (req, res, next) => {
      if (req.p.pushId) {
        const pushId = req.p.pushId;
        deviceService.getDeviceByPushId(pushId, (device) => {
          res.json(device);
          return next();
        });
      } else if (req.p.uid) {
        deviceService.getDevicesByUid(req.p.uid, (devices) => {
          res.json(devices);
          return next();
        });
      } else {
        res.statusCode = 400;
        res.json({
          code: 'error',
          message: 'pushId is required'
        });
        return next();
      }
    };

    router.all('/isConnected', handleQueryDevice);
    router.all('/device/get', handleQueryDevice);

    //兼容旧接口
    router.all('/redis/get', (req, res, next) => {
      const index = req.p.key.indexOf('#');
      const pushId = req.p.key.substring(index, req.p.key.length);
      deviceService.getDeviceByPushId(pushId, (device) => {
        if (device.connected) {
          res.json({
            value: 1
          });
        } else {
          res.json({});
        }
      })
    });

    router.all('/config', (req, res, next) => {
      res.json(config);
      return next();
    });
  }

  close() {
    if (this.httpServer) {
      this.httpServer.close();
    }
    if (this.spdyServer) {
      this.spdyServer.close();
    }
  }

}

function getLimitedArrayToLog(targets) {
  if (targets) {
    if (targets.length < 100) {
      return targets;
    } else {
      return "count-" + targets.length;
    }
  }
}