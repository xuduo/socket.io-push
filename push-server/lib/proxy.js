module.exports = function (config) {
    return new Proxy(config);
}

class Proxy {

    constructor(config) {
        const instance = config.instance || 1;
        this.port = config.port + instance - 1;

        const cluster = require('socket.io-push-redis/cluster')(config.redis);

        const srv = require('http').Server(function(req, res){
            res.writeHead(200);
            res.end();
        });
        srv.listen(this.port);

        this.io = require('socket.io')(srv,{
            pingTimeout: config.pingTimeout,
            pingInterval: config.pingInterval,
            transports: ['websocket', 'polling']
        });

        console.log(`start proxy on port  ${this.port} #${instance}`);

        this.tagService = require('./service/tagService')(cluster);
        this.stats = require('./stats/stats')(cluster, this.port, config.statsCommitThreshold);
        const socketIoRedis = require('socket.io-push-redis/adapter')({
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