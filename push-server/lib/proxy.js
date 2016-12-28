module.exports = function (ioServer, config) {
    return new Proxy(ioServer, config);
};

class Proxy {

    constructor(ioServer, config) {
        this.httpServer = ioServer.hs;
        this.httpsServer = ioServer.hss;
        this.io = ioServer;
        console.log(`start proxy on port  ${config.http_port} ${config.https_port} #${process.pid}`);
        if (this.io) {
            const cluster = require('socket.io-push-redis/cluster')(config.redis);
            this.tagService = require('./service/tagService')(cluster);
            this.connectService = require('./service/connectService')(cluster);
            const nodeCluster = require('cluster');
            let id = 0;
            if (nodeCluster.worker) {
                id = nodeCluster.worker.id;
            }
            const redisIncreBuffer = require('./stats/redisIncrBuffer')(cluster, config.statsCommitThreshold);
            this.stats = require('./stats/stats')(cluster, id, redisIncreBuffer, config.packetDropThreshold);
            this.topicOnline = require('./stats/topicOnline')(cluster, this.io, this.stats.id, config.topicOnlineFilter);
            this.arrivalStats = require('./stats/arrivalStats')(cluster, redisIncreBuffer, this.topicOnline);
            const socketIoRedis = require('socket.io-push-redis/adapter')({
                pubClient: cluster,
                subClient: cluster,
                key: 'io'
            }, null, this.stats);

            this.io.adapter(socketIoRedis);

            let packetService;
            if (config.redis.event) {
                packetService = require('./service/packetService')(cluster);
            }
            this.uidStore = require('./redis/uidStore')(cluster);
            this.ttlService = require('./service/ttlService')(this.io, cluster, config.ttl_protocol_version, this.stats, this.arrivalStats);
            const tokenTTL = config.tokenTTL || 1000 * 3600 * 24 * 30;
            this.tokenService = require('./service/tokenService')(cluster, tokenTTL);

            this.proxyServer = require('./server/proxyServer')(this.io, this.stats, packetService, this.tokenService, this.uidStore,
                this.ttlService, this.tagService, this.connectService, this.arrivalStats,config);
        } else {
            console.log('start proxy failed!');
        }

    }

    close() {
        if (this.io) {
            this.io.close();
        }
        if (this.httpServer) {
            this.httpServer.close();
        }
        if (this.httpsServer) {
            this.httpsServer.close();
        }
    }
}