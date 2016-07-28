module.exports = function (config, server) {
    return new Proxy(config, server);
}

class Proxy {

    constructor(config, server) {
        const instance = config.instance || 1;
        this.port = config.port + instance - 1;

        const cluster = require('./redis/simpleRedisHashCluster')(config.redis);

        this.io = require('socket.io')(server, {
            pingTimeout: config.pingTimeout,
            pingInterval: config.pingInterval,
            transports: ['websocket', 'polling']
        });
        server.listen(this.port);

        console.log(`start proxy on port  ${this.port} #${instance}`);

        this.tagService = require('./service/tagService')(cluster);
        this.stats = require('./stats/stats')(cluster, this.port, config.statsCommitThreshold);
        const socketIoRedis = require('./redis/redisAdapter')({
            pubClient: cluster,
            subClient: cluster,
            key: 'io'
        }, null, this.stats);
        this.io.adapter(socketIoRedis);
        let packetService;
        if (config.redis.event) {
            packetService = require('./service/packetService')(cluster, cluster);
        }
        this.uidStore = require('./redis/uidStore')(cluster);
        this.ttlService = require('./service/ttlService')(this.io, cluster, config.ttl_protocol_version);
        const tokenTTL = config.tokenTTL || 1000 * 3600 * 24 * 30;
        this.httpProxyService = require('./service/httpProxyService')(config.http_remove_headers);
        this.tokenService = require('./service/tokenService')(cluster, tokenTTL);

        this.proxyServer = require('./server/proxyServer')(this.io, this.stats, packetService, this.tokenService, this.uidStore, this.ttlService, this.httpProxyService, this.tagService);
        if (config.topicOnlineFilter) {
            this.topicOnline = require('./stats/topicOnline')(cluster, this.io, this.stats.id, config.topicOnlineFilter);
        }
    }

    close() {
        this.io.close();
        if (this.restApi) {
            this.restApi.close();
        }
    }
}