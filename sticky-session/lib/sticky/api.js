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
    var workerCount = options.workers || os.cpus().length;

    var master = new Master(Object.keys(servers), workerCount, options.env);
    master.listen();
    master.on('listening', function(port) {
      servers[port].emit('listening');
    });
    return false;
  }

  Object.keys(servers).forEach((port) => {
    let server = servers[port];
    // Override close callback to gracefully close server
    var oldClose = server.close;
    server.close = function close() {
      debug('graceful close');
      process.send({ type: 'close' });
      return oldClose.apply(this, arguments);
    };
  });

  process.on('message', function(msg, socket) {
    if (msg !== 'sticky:balance' || !socket)
      return;

    let server = servers[socket.localPort];
    debug('incoming socket');
    server._connections++;
    socket.server = server;
    server.emit('connection', socket);
  });
  return true;
}
exports.listen = listen;
