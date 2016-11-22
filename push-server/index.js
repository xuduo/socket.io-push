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
let sticky = require('sticky-session');
let stickyServers = [];
let serverTobeAttach = [];

let proxyHttpServer ;
let proxyHttpsServer;
if(proxy.instances > 0){
    proxyHttpServer = require('http').createServer();
    // proxyHttpsServer = require('https').createServer();
    proxyHttpsServer = require('http').createServer();
    let proxyServers = {};
    proxyServers[proxy.http_port] = proxyHttpServer;
    proxyServers[proxy.https_port] = proxyHttpsServer;
    stickyServers.push({servers: proxyServers, workers: proxy.instances});
    logger.debug('proxy listening, port:' + proxy.http_port + ',' + proxy.https_port
        + ' instances: ' + proxy.instances);
}

let apiHttpServer;
if(api.instances > 0){
    apiHttpServer = require('http').createServer();
    let apiServers = {};
    apiServers[api.port] = apiHttpServer;
    stickyServers.push({servers: apiServers, workers: api.instances});
    logger.debug('api listening, port: ' + api.port + ' instances: ' + api.instances);
}

let adminHttpServer;
if(admin.instances > 0){
    adminHttpServer = require('http').createServer();
    let adminServers = {};
    adminServers[admin.port] = adminHttpServer;
    stickyServers.push({servers: adminServers, workers: admin.instances});
    logger.debug('admin listening, port: ' + admin.port + ' instances: ' + admin.instances);
}

//[{workers: <n>, servers<{<port>:<server>}>}, {workers: <n>, servers<{<port>:<server>}}, ...]
if(!sticky.listen(stickyServers)){
    //master
    if(proxy.instances > 0){
        proxyHttpServer.once('listening', () => {
            logger.debug('proxy http listening ...');
        });
        proxyHttpsServer.once('listening', () => {
            logger.debug('proxy https listening ...')
        });
    }
    if(api.instances > 0){
        apiHttpServer.once('listening', () => {
            logger.debug('api http listening ...');
        });
    }
    if(admin.instances > 0) {
        adminHttpServer.once('listening', () => {
            logger.debug('admin http listening ...');
        });
    }
}else {
    //worker
    if(proxy.instances > 0){
        let ioServer = require('socket.io');
        let io = new ioServer({
            pingTimeout: proxy.pingTimeout,
            pingInterval: proxy.pingInterval,
            transports: ['websocket', 'polling']
        });
        io.attach(proxyHttpServer);
        io.attach(proxyHttpsServer);
        require('./lib/proxy')(io, proxy);
    }
    if(api.instances > 0){
        require('./lib/api')(apiHttpServer, api);
    }
    if(admin.instances > 0){
        // adminHttpServer.on('request', (req, res) => {res.end('ok')})
        require('./lib/admin')(adminHttpServer, admin);
    }


}
