module.exports = function(httpServer, spdyServer, config) {
  return new ApnProxy(httpServer, spdyServer, config);
};
const express = require('express');
const bodyParser = require('body-parser');
const paramParser = require('./util/paramParser');

class ApnProxy {

  constructor(httpServer, spdyServer, config) {

    console.log(`start apnProxy on port  http:${config.http_port} https:${config.https_port}  #${process.pid}`);

    const apnService = require('./service/apnProvider')(config.apns, config.apnApiUrls);

    const app = express();
    app.disable('etag');
    app.use("/api", bodyParser.urlencoded({ // to support URL-encoded bodies
      extended: true
    }));
    app.use("/api", bodyParser.json());
    app.use("/api", (req, res, next) => {
      res.set("Access-Control-Allow-Origin", "*");
      req.p = {};
      for (const param in req.body) {
        req.p[param] = req.body[param];
      }
      for (const param in req.query) {
        req.p[param] = req.query[param];
      }
      next();
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

    router.all('/apn', (req, res, next) => {
      apnService.callLocal(JSON.parse(req.p.notification), req.p.bundleId, paramParser.parseArrayParam(req.p.tokens), req.p.pattern, (result) => {
        result.code = "success";
        res.json(result);
        return next();
      });
    });
  }

  close() {
    console.log('closing apnProxy');
    if (this.httpServer) {
      this.httpServer.close();
    }
    if (this.spdyServer) {
      this.spdyServer.close();
    }
  }
}
