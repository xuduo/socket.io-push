module.exports = function (config, server) {
    return new Api(config, server);
}

class Api {

    constructor(config, server) {
        const instance = config.instance || 1;
        this.port = config.port = config.port + instance - 1;

        console.log(`start api on port  ${this.port} #${instance}`);
        const cluster = require('socket.io-push-redis/cluster')(config.redis);

        this.io = require('socket.io-push-redis/emitter')(cluster);

        this.tagService = require('./service/tagService')(cluster);
        this.stats = require('./stats/stats')(cluster, 0, config.statsCommitThreshold);
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
        this.apiRouter = require('./service/apiRouter')(this.uidStore, this.notificationService, this.ttlService, this.tagService, config.routerMaxPushIds, config.routerApiUrls);
        this.restApi = require('./api/restApi')(this.apiRouter, topicOnline, this.stats, config, cluster, apiThreshold, this.apnService, config.apiAuth, this.uidStore);
        this.onlineStats = require('./stats/onlineStats')(this.stats, this.port);
    }

    close() {
        this.restApi.close();
    }
}