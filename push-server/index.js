let logger = require('winston-proxy')('Index');

let proxy = {};
try {
    proxy = require(process.cwd() + "/config-proxy");
} catch (ex) {
    logger.warn('config-proxy exeception: ' + ex);
}
proxy.instances = proxy.instances || 0;
proxy.http_port = proxy.http_port || 10001;
proxy.https_port = proxy.https_port || 10443;

let api = {};
try {
    api = require(process.cwd() + "/config-api");
} catch (ex) {
    logger.warn('config-api exeception: ' + ex);
}
api.instances = api.instances || 0;
api.port = api.port || 11001;

let admin = {instances: 0};
try {
    admin = require(process.cwd() + "/config-admin");
    admin.instances = 1;
    admin.port = admin.port || 12001;
} catch (ex) {
    logger.warn('config-admin exeception: ' + ex);
}

let cluster = require('cluster');
let sticky = require('./lib/util/sticky-session.js');
let stickyServers = [];

let proxyHttpServer;
let proxyHttpsServer;
if (proxy.instances > 0) {
    let proxyServers = {};

    proxyHttpServer = require('http').createServer();
    proxyServers[proxy.http_port] = proxyHttpServer;

    let fs = require('fs');
    let https_key = null;
    let https_cert = null;
    try {
        https_key = fs.readFileSync(process.cwd() + '/cert/https/key.pem');
        https_cert = fs.readFileSync(process.cwd() + '/cert/https/cert.pem');
    } catch (err) {
        console.log('read https config file err:', err);
    }
    if (https_key && https_cert) {
        proxyHttpsServer = require('https').createServer({key: https_key, cert: https_cert});
        proxyServers[proxy.https_port] = proxyHttpsServer;
    }

    stickyServers.push({servers: proxyServers, workers: proxy.instances});
}

let apiHttpServer;
if (api.instances > 0) {
    apiHttpServer = require('http').createServer();
    let apiServers = {};
    apiServers[api.port] = apiHttpServer;
    stickyServers.push({servers: apiServers, workers: api.instances});
}

let adminHttpServer;
if (admin.instances > 0) {
    adminHttpServer = require('http').createServer();
    let adminServers = {};
    adminServers[admin.port] = adminHttpServer;
    stickyServers.push({servers: adminServers, workers: admin.instances});
}

//[{workers: <n>, servers<{<port>:<server>}>}, {workers: <n>, servers<{<port>:<server>}}, ...]
if (!sticky.listen(stickyServers)) {
    //master
    if (proxy.instances > 0) {
        proxyHttpServer.once('listening', () => {
            logger.debug('master proxy http listening ...');
        });
        if (proxyHttpsServer) {
            proxyHttpsServer.once('listening', () => {
                logger.debug('master proxy https listening ...')
            });
        }
    }
    if (api.instances > 0) {
        apiHttpServer.once('listening', () => {
            logger.debug('master api http listening ...');
        });
    }
    if (admin.instances > 0) {
        adminHttpServer.once('listening', () => {
            logger.debug('master admin http listening ...');
        });
    }
} else {
    //worker
    process.on('message', (msg) => {
        if (typeof(msg) != 'object' || !msg.port) {
            return
        }
        logger.debug('message received in worker, to start : ', msg);
        if (msg.port == proxy.http_port || msg.port == proxy.https_port) {
            let ioServer = require('socket.io');
            let io = new ioServer({
                pingTimeout: proxy.pingTimeout,
                pingInterval: proxy.pingInterval,
                transports: ['websocket', 'polling']
            });
            io.attach(proxyHttpServer);
            io.hs = proxyHttpServer;
            if (proxyHttpsServer) {
                io.attach(proxyHttpsServer);
                io.hss = proxyHttpsServer;
            }
            require('./lib/proxy')(io, proxy);
        } else if (msg.port == api.port) {
            require('./lib/api')(apiHttpServer, api);
        } else if (msg.port == admin.port) {
            require('./lib/admin')(adminHttpServer, admin);
        }
    });
}
