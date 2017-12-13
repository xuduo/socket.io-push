module.exports = function(httpServer, spdyServer, config) {
  return new Api(httpServer, spdyServer, config);
};

class Api {

  constructor(httpServer, spdyServer, config) {

    console.log(`start api on port  http:${config.http_port} https:${config.https_port}  #${process.pid}`);
    const cluster = require('socket.io-push-redis/cluster')(config.redis);
    this.mongo = require('./mongo/mongo')(config.prefix, config.mongo, config.mongo_log);
    this.io = require('socket.io-push-redis/emitter')(cluster, {
      key: config.prefix
    });

    const redisIncrBuffer = require('./stats/redisIncrBuffer')(this.mongo, config.statsCommitThreshold);
    this.stats = require('./stats/stats')(this.mongo, 0, redisIncrBuffer);
    const topicOnline = require('./stats/topicOnline')(this.mongo);
    this.arrivalStats = require('./stats/arrivalStats')(this.mongo, redisIncrBuffer, topicOnline);
    this.uidStore = require('./redis/uidStore')(config.prefix, cluster, this.mongo);
    this.deviceService = require('./service/deviceService')(this.mongo, this.uidStore);
    this.ttlService = require('./service/ttlService')(this.io, this.mongo, this.stats, this.arrivalStats);

    this.notificationService = require('./service/notificationService')(config.apns, this.mongo, this.ttlService, this.arrivalStats);

    const providerFactory = require('./service/notificationProviderFactory')(config.pushAllInterval);
    this.notificationService.providerFactory = providerFactory;
    if (config.apns != undefined) {
      this.apnService = require('./service/apnProvider')(config.apns, config.apnApiUrls, this.mongo, this.arrivalStats, this.deviceService, this.stats);
      providerFactory.addProvider(this.apnService);
    }
    providerFactory.addProvider(this.ttlService);
    if (config.huawei) {
      this.huaweiProvider = require('./service/huaweiProvider')(config.huawei, this.stats, this.mongo);
      providerFactory.addProvider(this.huaweiProvider);
    }
    if (config.xiaomi) {
      this.xiaomiProvider = require('./service/xiaomiProvider')(config.xiaomi, this.arrivalStats, this.stats);
      providerFactory.addProvider(this.xiaomiProvider);
      this.arrivalStats.xiaomiProvider = this.xiaomiProvider;
    }
    if (config.umeng) {
      this.umengProvider = require('./service/umengProvider')(config.umeng, this.arrivalStats, this.stats);
      providerFactory.addProvider(this.umengProvider);
      this.arrivalStats.umengProvider = this.umengProvider;
    }
    this.apiRouter = require('./service/apiRouter')(this.deviceService, this.notificationService, this.ttlService, config.notificationBatchSize, config.notificationBufferSize, config.routerApiUrls, this.stats);
    this.restApi = require('./api/restApi')(httpServer, spdyServer, this.apiRouter, topicOnline, this.stats, config, this.apnService, config.apiAuth, this.deviceService, this.arrivalStats);
  }

  close() {
    this.restApi.close();
    this.mongo.close();
  }
}
