module.exports = PushServer;

function PushServer(config) {
    if (!(this instanceof PushServer)) return new PushServer(config);
    var self = this;
    console.log("config " + JSON.stringify(config));
    var instance = config.instance || 1;
    console.log("starting instance #" + instance);
    var ioPort = config.io_port + instance - 1;
    var apiPort = config.api_port + instance - 1;

    var cluster = require('./redis/simpleRedisHashCluster.js')(config.redis);

    var io = require('socket.io')(ioPort, {
        pingTimeout: config.pingTimeout,
        pingInterval: config.pingInterval,
        transports: ['websocket', 'polling']
    });
    console.log("start server on port " + ioPort);
    var Stats = require('./stats/stats.js');
    var stats = new Stats(cluster, ioPort);
    var socketIoRedis = require('./redis/redisAdapter.js')({pubClient: cluster, subClient: cluster}, null, stats);
    io.adapter(socketIoRedis);
    var packetService = require('./service/packetService.js')(cluster, cluster);

    var uidStore = require('./redis/uidStore.js')(cluster);
    var ttlService = require('./service/ttlService.js')(cluster);
    var notificationService = require('./service/notificationService.js')(config.apns, cluster, ttlService);
    var proxyServer = require('./server/proxyServer.js')(io, stats, packetService, notificationService, uidStore, ttlService);
    var apiThreshold = require('./api/apiThreshold.js')(cluster);
    var adminCommand = require('./server/adminCommand.js')(cluster, stats, packetService, proxyServer, apiThreshold);
    var topicOnline;
    if (config.topicOnlineFilter) {
        topicOnline = require('./stats/topicOnline.js')(cluster, io, stats.id, config.topicOnlineFilter);
    }
    if (apiPort) {
        var apnService = require('./service/apnService.js')(config.apns, config.apnsSliceServers, cluster, stats);
        notificationService.apnService = apnService;
        self.restApi = require('./api/restApi.js')(io, topicOnline, stats, notificationService, apiPort, ttlService, cluster, apiThreshold, apnService, config.apiAuth, uidStore);
    }
}


