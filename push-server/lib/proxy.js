module.exports = function (ioServer, config) {
    return new Proxy(ioServer, config);
};

const urlCheck = require('./util/urlCheck');

class Proxy {

    constructor(ioServer, config) {
        this.httpServer = ioServer.hs;
        this.httpsServer = ioServer.hss;
        this.io = ioServer;
        if (this.io) {
            const cluster = require('socket.io-push-redis/cluster')(config.redis);
            this.tagService = require('./service/tagService')(cluster);
            this.connectService = require('./service/connectService')(cluster);
            this.stats = require('./stats/stats')(cluster, process.pid, config.statsCommitThreshold, config.packetDropThreshold);
            this.arrivalStats = require('./stats/arrivalStats')(cluster);
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
                this.ttlService, this.tagService, this.connectService, this.arrivalStats);
            if (config.topicOnlineFilter) {
                this.topicOnline = require('./stats/topicOnline')(cluster, this.io, this.https_io, this.stats.id, config.topicOnlineFilter);
            }
        } else {
            console.log('start proxy failed!');
        }

    }

    close() {
        if (this.io) {
            this.io.close();
        }
        if(this.httpServer){
            this.httpServer.close();
        }
        if(this.httpsServer){
            this.httpsServer.close();
        }
    }
}