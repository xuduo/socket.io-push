let logger = require('winston-proxy')('Index');
let cluster = require('cluster');
let net = require('net');
let fs = require('fs');
let hashUtil = require('socket.io-push-redis/util');
let proxy = {};
try {
    proxy = require(process.cwd() + "/config-proxy");
} catch (ex) {
    logger.warn('config-proxy exception: ' + ex);
}
proxy.instances = proxy.instances || 0;


let api = {};
try {
    api = require(process.cwd() + "/config-api");
} catch (ex) {
    logger.warn('config-api exception: ' + ex);
}
api.instances = api.instances || 0;


let admin = {};
try {
    admin = require(process.cwd() + "/config-admin");
    if (admin.https_port && admin.https_cert && admin.https_key) {
        admin.instances = 1;
    }
} catch (ex) {
    logger.warn('config-admin exception: ' + ex);
}
admin.instances = admin.instances || 0;

if (cluster.isMaster) {
    let totalWorker = proxy.instances + api.instances + admin.instances;
    require('fs').writeFile(process.cwd() + '/num_processes', totalWorker, (err) => {
        if (err) {
            logger.error("fail to write num of processes");
        }
    });
    logger.info('total worker: ' + totalWorker);
    let spawn = (env, workerPool) => {
        let worker = cluster.fork(env);
        worker.on('exit', (code, signal) => {
            logger.error('worker(%s) exit, code:%s, signal:%s', worker.id, code, signal);
            let newWorker = spawn(env, workerPool);
            if (workerPool) {
                let index = workerPool.indexOf(worker);
                workerPool[index] = newWorker;
                logger.debug('respwan new worker(%s), workers: %s, pid: %s', newWorker.id,
                    workerPool.map((worker) => {
                        return worker.id
                    }),
                    workerPool.map((worker) => {
                        return worker.process.pid;
                    }));
            }
        });
        return worker;
    };

    let lastIndexNumber = 0;

    let rr = (workers) => {
        if (++lastIndexNumber == workers.length) lastIndexNumber = 0;
        return workers[lastIndexNumber];
    };

    if (proxy.instances > 0) {
        let proxy_workers = [];
        for (let i = 0; i < proxy.instances; i++) {
            proxy_workers.push(spawn({processType: 'proxy'}, proxy_workers));
        }
        if (proxy.http_port) {
            createNetServer(proxy_workers, hashUtil.getByHash, proxy.http_port, proxy.host);
        }
        if (proxy.https_port && proxy.https_key && proxy.https_cert) {
            createNetServer(proxy_workers, hashUtil.getByHash, proxy.https_port, proxy.host);
        }
    }
    if (api.instances > 0) {
        let api_workers = [];
        for (let i = 0; i < api.instances; i++) {
            api_workers.push(spawn({processType: 'api'}, api_workers));
        }
        if (api.http_port) {
            createNetServer(api_workers, rr, api.http_port, api.host);
        }
        if (api.https_port && api.https_key && api.https_cert) {
            createNetServer(api_workers, rr, api.https_port, api.host);
        }
    }
    if (admin.instances > 0) {
        spawn({processType: 'admin'})
    }
} else {
    if (process.env.processType) {
        let servers = {};
        let socketTimeout = 0;
        if (process.env.processType == 'proxy') {
            let IoServer = require('socket.io');
            socketTimeout = proxy.pingTimeout + proxy.pingInterval + 10 * 1000;
            let io = new IoServer({
                pingTimeout: proxy.pingTimeout,
                pingInterval: proxy.pingInterval,
                transports: ['websocket', 'polling']
            });
            if (proxy.http_port) {
                let httpServer = require('http').createServer((req, res) => {
                    res.writeHead(404);
                    res.end();
                });
                io.attach(httpServer);
                io.hs = httpServer;
                servers[proxy.http_port] = httpServer;
            }
            if (proxy.https_port && proxy.https_key && proxy.https_cert) {
                try {
                    let https_key = fs.readFileSync(proxy.https_key);
                    let https_cert = fs.readFileSync(proxy.https_cert);
                    let httpsServer = require('https').createServer({key: https_key, cert: https_cert}, (req, res) => {
                        res.writeHead(404);
                        res.end();
                    });
                    io.attach(httpsServer);
                    io.hss = httpsServer;
                    servers[proxy.https_port] = httpsServer;
                } catch (e) {
                    logger.error('error happened when start https on proxy.');
                    process.exit(-1);
                }

            }
            require('./lib/proxy')(io, proxy);
        } else if (process.env.processType == 'api') {
            let spdyServer, httpServer;
            socketTimeout = api.socketTimeout || 0;
            if (api.http_port) {
                httpServer = require('http').createServer();
                servers[api.http_port] = httpServer;
            }
            if (api.https_port && api.https_cert && api.https_key) {
                let options = {
                    key: fs.readFileSync(api.https_key),
                    cert: fs.readFileSync(api.https_cert)
                };
                spdyServer = require('spdy').createServer(options);
                servers[api.https_port] = spdyServer;
            }
            if (httpServer || spdyServer) {
                require('./lib/api')(httpServer, spdyServer, api);
            }
        } else if (process.env.processType == 'admin') {
            require('./lib/admin')(admin);
        }
        if (Object.keys(servers).length > 0) {
            process.on('message', (msg, socket) => {
                if (msg !== 's:conn') {
                    return;
                }
                logger.debug('connection on worker: ', cluster.worker.id, socket.remoteAddress, socket.remotePort, socket.localPort);
                servers[socket.localPort].emit('connection', socket);
                socket.resume();
                socket.setTimeout(socketTimeout, ()=> {
                    logger.info("socket timeout ", socket.remoteAddress, socket.remotePort, socket.localPort);
                });
            });
        }
    }

}

function createNetServer(workers, lb, port, host) {
    const server = net.createServer({pauseOnConnect: true}, (socket) => {
        let worker = lb(workers, socket.remoteAddress);
        worker.send('s:conn', socket);
    });
    if (host) {
        server.listen(port, host);
    } else {
        server.listen(port);
    }
}