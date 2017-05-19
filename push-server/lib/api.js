module.exports = function(httpServer, spdyServer, config) {
  return new Api(httpServer, spdyServer, config);
};

class Api {

  constructor(httpServer, spdyServer, config) {

    console.log(`start api on port  http:${config.http_port} https:${config.https_port}  #${process.pid}`);
    const cluster = require('socket.io-push-redis/cluster')(config.redis);
    this.mongo = require('./mongo/mongo')(config.prefix, config.mongo);
    this.io = require('socket.io-push-redis/emitter')(cluster, {
      key: config.prefix
    });

    this.tagService = require('./service/tagService')(this.mongo);
    this.connectService = require('./service/connectService')(this.mongo);
    const redisIncrBuffer = require('./stats/redisIncrBuffer')(this.mongo, config.statsCommitThreshold);
    this.stats = require('./stats/stats')(this.mongo, 0, redisIncrBuffer);
    const topicOnline = require('./stats/topicOnline')(this.mongo);
    this.arrivalStats = require('./stats/arrivalStats')(this.mongo, topicOnline);
    this.uidStore = require('./redis/uidStore')(config.prefix, cluster, this.mongo);
    this.ttlService = require('./service/ttlService')(this.io, this.mongo, this.stats, this.arrivalStats);

    this.notificationService = require('./service/notificationService')(config.apns, this.mongo, this.ttlService, this.arrivalStats);

    const providerFactory = require('./service/notificationProviderFactory')();
    this.notificationService.providerFactory = providerFactory;
    if (config.apns != undefined) {
      this.tokenService = require('./service/tokenService')(this.mongo);
      this.apnService = require('./service/apnProvider')(config.apns, config.apnApiUrls, this.mongo, this.arrivalStats, this.tokenService);
      providerFactory.addProvider(this.apnService);
    }
    if (config.huawei) {
      this.huaweiProvider = require('./service/huaweiProvider')(config.huawei, this.stats);
      providerFactory.addProvider(this.huaweiProvider);
    }
    if (config.xiaomi) {
      this.xiaomiProvider = require('./service/xiaomiProvider')(config.xiaomi, this.arrivalStats);
      providerFactory.addProvider(this.xiaomiProvider);
      this.arrivalStats.xiaomiProvider = this.xiaomiProvider;
    }
    this.apiRouter = require('./service/apiRouter')(this.uidStore, this.notificationService, this.ttlService, this.tagService, config.routerMaxPushIds, config.routerApiUrls);
    this.restApi = require('./api/restApi')(httpServer, spdyServer, this.apiRouter, topicOnline, this.stats, config, this.apnService, config.apiAuth, this.uidStore, this.connectService, this.arrivalStats);
  }

  close() {
    this.restApi.close();
    this.mongo.close();
  }
}
