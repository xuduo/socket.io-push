module.exports = function (config) {
    return new Proxy(config);
};

const urlCheck = require('./util/urlCheck');
const net = require('net');

class Proxy {

    constructor(config) {
        this.tcp_port = config.port;
        this.http_port = this.tcp_port + 1;
        this.https_port = this.tcp_port + 2;

        const cluster = require('socket.io-push-redis/cluster')(config.redis);

        const srv = require('http').Server(function (req, res) {
            urlCheck.checkPathname(req, res);
        });
        srv.listen(this.http_port);

        this.io = require('socket.io')(srv, {
            pingTimeout: config.pingTimeout,
            pingInterval: config.pingInterval,
            transports: ['websocket', 'polling']
        });
        console.log(`start proxy on port  ${this.http_port}`);

        if (this.https_port && config.https_key && config.https_crt) {
            let fs = require('fs');
            let options = {
                key: fs.readFileSync(config.https_key),
                cert: fs.readFileSync(config.https_crt)
            };

            this.https_srv = require('https').Server(options, function (req, res) {
                urlCheck.checkPathname(req, res);
            });
            this.https_srv.listen(this.https_port);
            this.https_io = require('socket.io')(this.https_srv, {
                pingTimeout: config.pingTimeout,
                pingInterval: config.pingInterval,
                transports: ['websocket', 'polling']
            });
            console.log(`start https proxy on port  ${this.https_port}`);
        }

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
        this.https_io.adapter(socketIoRedis);

        let packetService;
        if (config.redis.event) {
            packetService = require('./service/packetService')(cluster);
        }
        this.uidStore = require('./redis/uidStore')(cluster);
        this.ttlService = require('./service/ttlService')(this.io, this.https_io, cluster, config.ttl_protocol_version, this.stats, this.arrivalStats);
        const tokenTTL = config.tokenTTL || 1000 * 3600 * 24 * 30;
        this.tokenService = require('./service/tokenService')(cluster, tokenTTL);

        this.proxyServer = require('./server/proxyServer')(this.io, this.https_io, this.stats, packetService, this.tokenService, this.uidStore,
            this.ttlService, this.tagService, this.connectService, this.arrivalStats);
        if (config.topicOnlineFilter) {
            this.topicOnline = require('./stats/topicOnline')(cluster, this.io, this.https_io, this.stats.id, config.topicOnlineFilter);
        }

        this.tcpServer = net.createServer((conn)=> {
            conn.once('data', (buf) => {
                // A TLS handshake record starts with byte 22.
                let address = (buf[0] === 22) ? this.https_port : this.http_port;
                let proxy = net.createConnection(address, () => {
                    proxy.write(buf);
                    conn.pipe(proxy).pipe(conn);
                });
            });
        });
        this.tcpServer.listen(this.tcp_port);
    }

    close() {
        this.tcpServer.close();
        this.io.close();
        this.https_io.close();
        if (this.restApi) {
            this.restApi.close();
        }
    }
}