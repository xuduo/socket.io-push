module.exports = PushServer;

function PushServer(config) {
    if (!(this instanceof PushServer)) return new PushServer(config);
    var self = this;
    console.log("config " + JSON.stringify(config));
    var instance = config.instance || 1;
    console.log("starting instance #" + instance);
    var ioPort = config.io_port + instance - 1;
    var apiPort = config.api_port + instance - 1;


    var simpleRedisHashCluster = require('./redis/simpleRedisHashCluster.js');

    new simpleRedisHashCluster(config.redis, function (cluster) {

        var io = require('socket.io')(ioPort, {
            pingTimeout: config.pingTimeout,
            pingInterval: config.pingInterval,
            transports: ['websocket']
        });
        console.log("start server on port " + ioPort);
        var Stats = require('./stats/stats.js');
        var stats = new Stats(cluster, ioPort);
        var socketIoRedis = require('./redis/redisAdapter.js')({pubClient: cluster, subClient: cluster}, null, stats);
        //var socketIoRedis = require('socket.io-redis')({pubClient: cluster, subClient: cluster}, null, stats);
        io.adapter(socketIoRedis);
        var packetService = require('./service/packetService.js')(cluster, cluster);

        var TtlService = require('./service/ttlService.js');
        var ttlService = new TtlService(cluster);
        var notificationService = require('./service/notificationService.js')(config.apns, cluster, ttlService);
        var ProxyServer = require('./server/proxyServer.js');
        var proxyServer = new ProxyServer(io, stats, packetService, notificationService, ttlService);
        var ApiThreshold = require('./api/apiThreshold.js');
        var apiThreshold = new ApiThreshold(cluster);
        var AdminCommand = require('./server/adminCommand.js');
        var adminCommand = new AdminCommand(cluster, stats, packetService, proxyServer, apiThreshold);
        var topicOnline;
        if(config.topicOnlineFilter) {
            topicOnline = require('./stats/topicOnline.js')(cluster, io, stats.id, config.topicOnlineFilter);
        }
        if (apiPort) {
            var apnService = require('./service/apnService.js')(config.apns, config.apnsSliceServers, cluster, stats);
            notificationService.apnService = apnService;
            self.restApi = require('./api/restApi.js')(io, topicOnline, stats, notificationService, apiPort, ttlService, cluster, apiThreshold, apnService, config.apiAuth);
        }
    });
}


