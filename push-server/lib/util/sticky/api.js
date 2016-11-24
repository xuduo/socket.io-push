'use strict';

var cluster = require('cluster');
var os = require('os');
var debug = require('debug')('sticky:worker');

var sticky = require('../sticky-session');
var Master = sticky.Master;

function listen(servers, options) {
    if (!options)
        options = {};


    if (cluster.isMaster) {

        let master = new Master(servers, options.env);
        master.listen();
        master.on('listening', (port) => {
            servers.forEach((server) => {
                let httpServers = server.servers;
                if (Object.keys(httpServers).indexOf(port) != -1) {
                    let server = httpServers[port];
                    server.emit('listening');
                }
            });
        });
    }

    servers.forEach((server) => {
        let httpServers = server.servers;
        Object.keys(httpServers).forEach((port) => {
            let httpServer = httpServers[port];
            let oldClose = httpServer.close;
            httpServer.close = function () {
                debug('graceful close');
                process.send({type: 'close'});
                return oldClose.apply(httpServer, arguments);
            }
        })
    });

    process.on('message', function (msg, socket) {
        if (msg !== 'sticky:balance' || !socket)
            return;

        debug('message arrival');
        servers.forEach((server) => {
            let httpServers = server.servers;
            debug('try..', server.workers);
            debug('socket port', socket.localPort);
            debug('ports', Object.keys(httpServers));
            if (Object.keys(httpServers).indexOf(socket.localPort.toString()) != -1) {
                let server = httpServers[socket.localPort];
                debug('incoming socket in worker: ' + cluster.worker.id);
                server._connections++;
                socket.server = server;
                server.emit('connection', socket)
            }
        });

    });
    return true;
}
exports.listen = listen;
