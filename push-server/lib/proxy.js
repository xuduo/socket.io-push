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
        this.io = new ioServer();
        let opt = {
            pingTimeout: config.pingTimeout,
            pingInterval: config.pingInterval,
            transports: ['websocket', 'polling']
        };

        if (config.http_port) {
            this.httpServer = http.createServer((req, res) => {
                urlCheck.checkPathname(req, res);
            });
            this.httpServer.listen(config.http_port);
            this.io.attach(this.httpServer, opt);
            console.log(`start http proxy on port:  ${config.http_port}`);
        }

        if (config.https_port) {
            let fs = require('fs');
            let https_key = null;
            let https_cert = null;
            try {
                https_key = fs.readFileSync(__dirname + '/../cert/https/key.pem');
                https_cert = fs.readFileSync(__dirname + '/../cert/https/cert.pem');
            } catch (err) {
                console.log('read https config file err:', err);
            }

            if (https_key && https_cert) {
                let options = {
                    key: https_key,
                    cert: https_cert
                };
                this.httpsServer = https.createServer(options, (req, res) => {
                    urlCheck.checkPathname(req, res);
                });
                this.httpsServer.listen(config.https_port);
                this.io.attach(this.httpsServer, opt);
                console.log(`start https proxy on port:  ${config.https_port}`);
            } else {
                console.log('https https key or cert file invalid!');
            }
        }

        if (this.httpServer || this.httpsServer) {
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
        if (this.httpServer) {
            this.httpServer.close();
        }
        if (this.httpsServer) {
            this.httpsServer.close();
        }
        if (this.restApi) {
            this.restApi.close();
        }
    }
}