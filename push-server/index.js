let logger = require('winston-proxy')('Index');
let cluster = require('cluster');
let sticky = require('sticky-session');

let proxy = {};
try {
    proxy = require(process.cwd() + "/config-proxy");
} catch (ex) {
    logger.warn('config-proxy exeception: ' + ex);
}
proxy.instances = proxy.instances || 0;


let api = {};
try {
    api = require(process.cwd() + "/config-api");
} catch (ex) {
    logger.warn('config-api exeception: ' + ex);
}
api.instances = api.instances || 0;


let admin = {instances: 0};
try {
    admin = require(process.cwd() + "/config-admin");
    admin.instances = 1;
    admin.port = admin.port || 12001;
} catch (ex) {
    logger.warn('config-admin exeception: ' + ex);
}

let stickyServers = [];
let proxyHttpServer;
let proxyHttpsServer;
if (proxy.instances > 0 && proxy.http_port) {
    let proxyServers = {};

    proxyHttpServer = require('http').createServer();
    proxyServers[proxy.http_port] = proxyHttpServer;

    let fs = require('fs');
    let https_key = null;
    let https_cert = null;
    try {
        https_key = fs.readFileSync(proxy.https_key);
        https_cert = fs.readFileSync(proxy.https_cert);
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
if (api.instances > 0 && api.port) {
    apiHttpServer = require('http').createServer();
    let apiServers = {};
    apiServers[api.port] = apiHttpServer;
    stickyServers.push({servers: apiServers, workers: api.instances});
}

let adminHttpServer;
if (admin.instances > 0 && admin.port) {
    adminHttpServer = require('http').createServer();
    let adminServers = {};
    adminServers[admin.port] = adminHttpServer;
    stickyServers.push({servers: adminServers, workers: admin.instances});
}

//[{workers: <n>, servers<{<port>:<server>}>}, {workers: <n>, servers<{<port>:<server>}}, ...]
if (!sticky.listen(stickyServers)) {
    //master
    if (proxy.instances > 0) {
        let ports = proxy.http_port.toString();
        proxyHttpServer.once('listening', () => {
            logger.debug('proxy http listening ...');
        });
        if (proxyHttpsServer) {
            ports += proxy.https_port.toString();
            proxyHttpsServer.once('listening', () => {
                logger.debug('proxy https listening ...')
            });
        }
        logger.debug('proxy start, port: ' + ports + ' instances: ' + proxy.instances);
    }
    if (api.instances > 0) {
        logger.debug('api start, port: ' + api.port + ' instances: ' + api.instances);
        apiHttpServer.once('listening', () => {
            logger.debug('api http listening ...');
        });
    }
    if (admin.instances > 0) {
        logger.debug('admin start, port: ' + admin.port + ' instances: ' + admin.instances);
        adminHttpServer.once('listening', () => {
            logger.debug('admin http listening ...');
        });
    }
} else {
    //worker
    if (process.env.port) {
        let ports = JSON.parse(process.env.port);
        if (ports.indexOf(proxy.http_port.toString()) != -1 || ports.indexOf(proxy.https_port.toString()) != -1) {
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
        } else if (ports.indexOf(api.port.toString()) != -1) {
            require('./lib/api')(apiHttpServer, api);
        } else if (ports.indexOf(admin.port.toString()) != -1) {
            require('./lib/admin')(adminHttpServer, admin);
        }
    }
}
