let logger = require('winston-proxy')('Index');
let cluster = require('cluster');
let net = require('net');
let fs = require('fs');

let api = {};
try {
    api = require(process.cwd() + "/config-api");
} catch (ex) {
    logger.warn('config-api exception: ' + ex);
}
api.instances = api.instances || 0;

let spdyServer, httpServer;
if (api.http_port) {
    httpServer = require('http').createServer();
}
if (api.https_port && api.https_cert && api.https_key) {
    let options = {
        key: fs.readFileSync(api.https_key),
        cert: fs.readFileSync(api.https_cert)
    };
    spdyServer = require('spdy').createServer(options);
}
if (httpServer || spdyServer) {
    require('./lib/api')(httpServer, spdyServer, api);
}
if (httpServer) {
    logger.debug('listening on ' + api.http_port);
    httpServer.listen(api.http_port);
}
if (spdyServer) {
    logger.debug('listening on ' + api.https_port);
    spdyServer.listen(api.https_port);
}