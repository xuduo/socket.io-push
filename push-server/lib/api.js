module.exports = function (httpServer, spdyServer, config) {
    return new Api(httpServer, spdyServer, config);
};

class Api {

    constructor(httpServer, spdyServer, config) {
        
        console.log(`start api on port  http:${config.http_port} https:${config.https_port}  #${process.pid}`);
        const cluster = require('socket.io-push-redis/cluster')(config.redis);

        this.io = require('socket.io-push-redis/emitter')(cluster);

        this.tagService = require('./service/tagService')(cluster);
        this.connectService = require('./service/connectService')(cluster);
        let redisIncrBuffer = require('./stats/redisIncrBuffer')(cluster, config.statsCommitThreshold);
        this.stats = require('./stats/stats')(cluster, 0, redisIncrBuffer);
        this.arrivalStats = require('./stats/arrivalStats')(cluster, redisIncrBuffer);
        this.uidStore = require('./redis/uidStore')(cluster);
        this.ttlService = require('./service/ttlService')(this.io, cluster, config.ttl_protocol_version, this.stats, this.arrivalStats);
        const tokenTTL = config.tokenTTL || 1000 * 3600 * 24 * 30;
        this.notificationService = require('./service/notificationService')(config.apns, cluster, this.ttlService, tokenTTL);

        const apiThreshold = require('./api/apiThreshold')(cluster, config.topicThreshold);
        const topicOnline = require('./stats/topicOnline')(cluster);
        const providerFactory = require('./service/notificationProviderFactory')();
        this.notificationService.providerFactory = providerFactory;
        if (config.apns != undefined) {
            this.apnService = require('./service/apnProvider')(config.apns, config.apnApiUrls, cluster, this.stats, tokenTTL);
            providerFactory.addProvider(this.apnService);
        }
        if (config.huawei) {
            this.huaweiProvider = require('./service/huaweiProvider')(config.huawei, this.stats);
            providerFactory.addProvider(this.huaweiProvider);
        }
        if (config.xiaomi) {
            this.xiaomiProvider = require('./service/xiaomiProvider')(config.xiaomi, this.stats);
            providerFactory.addProvider(this.xiaomiProvider);
        }
        this.apiRouter = require('./service/apiRouter')(this.uidStore, this.notificationService, this.ttlService, this.tagService, config.routerMaxPushIds, config.routerApiUrls);
        this.onlineStats = require('./stats/onlineStats')(this.stats);
        this.restApi = require('./api/restApi')(httpServer, spdyServer, this.apiRouter, topicOnline, this.stats, config, cluster, apiThreshold, this.apnService, config.apiAuth, this.uidStore, this.onlineStats, this.connectService, this.arrivalStats);
    }

    close() {
        this.restApi.close();
    }
}