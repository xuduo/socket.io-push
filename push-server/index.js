let logger = require('winston-proxy')('Index');

let proxy = {};
try {
    proxy = require(process.cwd() + "/config-proxy");
} catch (ex) {
    logger.warn('config-proxy exeception: ' + ex);
}
proxy.instances = proxy.instances || 0;
if(proxy.instances > 0){
    let cluster = require('cluster');
    let stiky = require('sticky-session');
    let server = require('http').createServer();
    let server2 = require('http').createServer();
    let stikyServers = {};
    stikyServers[proxy.http_port] = server;
    stikyServers[10002] = server2;
    logger.debug('proxy listening, port:' + proxy.http_port + ' instances: ' + proxy.instances);
    if(!stiky.listen(stikyServers, {workers: proxy.instances})){
        server.once('listening', () => {
            logger.debug('server1 started on ' + proxy.http_port);
        });
        server2.once('listening', () => {
            logger.debug('server2 listening on ' + 10002);
        })
    }else {
        let ioServer = require('socket.io');
        let io = new ioServer({
            pingTimeout: proxy.pingTimeout,
            pingInterval: proxy.pingInterval,
            transports: ['websocket', 'polling']
        });
        io.attach(server);
        io.attach(server2);
        require('./lib/proxy')(io, proxy);
    }
}

//
// let api = {};
// try {
//     api = require(process.cwd() + "/config-api");
// } catch (ex) {
//     logger.warn('config-api exeception: ' + ex);
// }
// api.instances = api.instances || 0;
//
// let admin = {instances: 0};
// try {
//     admin = require(process.cwd() + "/config-admin");
//     admin.instances = 1;
// } catch (ex) {
//     logger.warn('config-admin exeception: ' + ex);
// }
//
// var cluster = require('cluster');
//
// if (cluster.isMaster) {
//     var totalFork = proxy.instances + api.instances + admin.instances;
//     for (var i = 0; i < totalFork; i++) {
//         cluster.fork();
//     }
//     let fs = require('fs');
//     let path = process.cwd();
//     fs.writeFile(path + '/num_processes', totalFork, (err) => {
//         if (err) {
//             logger.error("fail to write num of processes");
//         }
//     });
//     let pid = process.pid;
//     fs.writeFile(path + '/server_master_pid', pid.toString(), (err) => {
//         if (err) {
//             logger.error("fail to write pid of server_master");
//         }
//     });
//     logger.info("cluster master totalFork " + totalFork);
// } else {
//     if (cluster.worker.id <= proxy.instances) {
//         require('./lib/proxy')(proxy);
//     } else if (cluster.worker.id > proxy.instances && cluster.worker.id <= ( proxy.instances + api.instances)) {
//         require('./lib/api')(api);
//     } else if (cluster.worker.id == (proxy.instances + api.instances + admin.instances)) {
//         require('./lib/admin')(admin);
//     }
// }