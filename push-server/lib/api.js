module.exports = function (config, server) {
    return new Proxy(config, server);
}

class Proxy {

    constructor(config, server) {
        const instance = config.instance || 1;
        console.log("starting instance #" + instance);
        config.io_port = config.io_port + instance - 1;
        config.api_port = config.api_port + instance - 1;

        const cluster = require('./redis/simpleRedisHashCluster')(config.redis);

        this.io = require('./redis/emitter')(cluster);

        this.tagService = require('./service/tagService')(cluster);
        this.stats = require('./stats/stats')(cluster, config.io_port, config.statsCommitThreshold);
        let packetService;
        if (config.redis.event) {
            packetService = require('./service/packetService')(cluster, cluster);
        }
        this.uidStore = require('./redis/uidStore')(cluster);
        this.ttlService = require('./service/ttlService')(this.io, cluster, config.ttl_protocol_version);
        const tokenTTL = config.tokenTTL || 1000 * 3600 * 24 * 30;
        this.notificationService = require('./service/notificationService')(config.apns, cluster, this.ttlService, tokenTTL);

        const apiThreshold = require('./api/apiThreshold')(cluster);
        let topicOnline;
        if (config.topicOnlineFilter) {
            topicOnline = require('./stats/topicOnline')(cluster, this.io, this.stats.id, config.topicOnlineFilter);
        }
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
        if (config.api_port) {
            this.apiRouter = require('./service/apiRouter')(this.uidStore, this.notificationService, this.ttlService, this.tagService, config.routerMaxPushIds, config.routerApiUrls);
            this.restApi = require('./api/restApi')(this.apiRouter, topicOnline, this.stats, config, cluster, apiThreshold, this.apnService, config.apiAuth, this.uidStore);
            this.onlineStats = require('./stats/onlineStats')(this.stats, config.api_port);
        }
    }

    close() {
        this.io.close();
        if (this.restApi) {
            this.restApi.close();
        }
    }
}