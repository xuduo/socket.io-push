module.exports = PushServer;

function PushServer(config) {
    if (!(this instanceof PushServer)) return new PushServer(config);
    var instance = config.instance || 1;
    console.log("starting instance #" + instance);
    config.io_port = config.io_port + instance - 1;
    config.api_port = config.api_port + instance - 1;

    var cluster = require('./redis/simpleRedisHashCluster.js')(config.redis);

    this.io = require('socket.io')(config.io_port, {
        pingTimeout: config.pingTimeout,
        pingInterval: config.pingInterval,
        transports: ['websocket', 'polling']
    });
    console.log("start server on port " + config.io_port);
    this.stats = require('./stats/stats.js')(cluster, config.io_port, config.statsCommitThreshold);
    var socketIoRedis = require('./redis/redisAdapter.js')({pubClient: cluster, subClient: cluster}, null, this.stats);
    this.io.adapter(socketIoRedis);
    var packetService;
    if (config.redis.event) {
        packetService = require('./service/packetService.js')(cluster, cluster);
    }

    this.uidStore = require('./redis/uidStore.js')(cluster);
    var ttlService = require('./service/ttlService.js')(cluster, config.ttl_protocol_version);
    var tokenTTL = config.tokenTTL || 1000 * 3600 * 24 * 30;
    this.notificationService = require('./service/notificationService.js')(config.apns, cluster, ttlService, tokenTTL);
    var proxyServer = require('./server/proxyServer.js')(this.io, this.stats, packetService, this.notificationService, this.uidStore, ttlService);
    var apiThreshold = require('./api/apiThreshold.js')(cluster);
    var adminCommand = require('./server/adminCommand.js')(cluster, this.stats, packetService, proxyServer, apiThreshold);
    var topicOnline;
    if (config.topicOnlineFilter) {
        topicOnline = require('./stats/topicOnline.js')(cluster, this.io, this.stats.id, config.topicOnlineFilter);
    }
    var providerFactory = require('./service/notificationProviderFactory.js')();
    this.notificationService.providerFactory = providerFactory;
    if (config.apns != undefined) {
        this.apnService = require('./service/apnProvider.js')(config.apns, config.apnsSliceServers, cluster, this.stats, tokenTTL);
        providerFactory.addProvider(this.apnService);
    }
    if (config.huawei) {
        this.huaweiProvider = require('./service/huaweiProvider.js')(config.huawei, this.stats);
        providerFactory.addProvider(this.huaweiProvider);
    }
    if (config.xiaomi) {
        this.xiaomiProvider = require('./service/xiaomiProvider.js')(config.xiaomi, this.stats);
        providerFactory.addProvider(this.xiaomiProvider);
    }
    if (config.api_port) {
        this.restApi = require('./api/restApi.js')(this.io, topicOnline, this.stats, this.notificationService, config, ttlService, cluster, apiThreshold, this.apnService, config.apiAuth, this.uidStore);
    }
}

PushServer.prototype.close = function () {
    this.io.close();
    if (this.restApi) {
        this.restApi.close();
    }
};