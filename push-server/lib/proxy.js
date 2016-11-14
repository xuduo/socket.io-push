module.exports = function (config) {
    return new Proxy(config);
};

const urlCheck = require('./util/urlCheck');
const net = require('net');
const ioServer = require('socket.io');
const http = require('http');
const https = require('https');

class Proxy {

    constructor(config) {
        this.http_port = config.http_port;
        this.https_port = config.https_port;

        this.http_srv = http.createServer((req, res) => {
            urlCheck.checkPathname(req, res);
        });
        this.http_srv.listen(this.http_port);
        console.log(`start http proxy on port:  ${this.http_port}`);

        if (this.https_port && config.https_key && config.https_crt) {
            let fs = require('fs');
            let options = {
                key: fs.readFileSync(config.https_key),
                cert: fs.readFileSync(config.https_crt)
            };

            this.https_srv = https.createServer(options, (req, res) => {
                urlCheck.checkPathname(req, res);
            });
            this.https_srv.listen(this.https_port);
        }
        console.log(`start https proxy on port:  ${this.https_port}`);

        let opt = {
            pingTimeout: config.pingTimeout,
            pingInterval: config.pingInterval,
            transports: ['websocket', 'polling']
        };
        this.io = new ioServer();
        this.io.attach(this.http_srv, opt);
        this.io.attach(this.https_srv, opt);

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

    }

    close() {
        if (this.io) {
            this.io.close();
        }
        if (this.http_srv) {
            this.http_srv.close();
        }
        if (this.https_srv) {
            this.https_srv.close();
        }
        if (this.restApi) {
            this.restApi.close();
        }
    }
}