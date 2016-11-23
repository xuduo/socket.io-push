'use strict';

var cluster = require('cluster');
var EventEmiter = require('events').EventEmitter;
var util = require('util');
var net = require('net');
var ip = require('ip');

var debug = require('debug')('sticky:master');

function Master(servers, env) {

  this.env = env || {};
  this.seed = (Math.random() * 0xffffffff) | 0;
  this.workers = {};
  this.netServers = {};

  servers.forEach((server) => {
    let httpServers = server.servers;
    let workrCount = server.workers;
    let ports = Object.keys(httpServers);
    let listenCount = 0;
    debug('ports = ', ports);
    ports.forEach((port) => {
      debug('port = ' + port);
      let netServer = net.Server.call(this, {pauseOnConnect: true}, this.balance.apply(this, arguments));
      netServer.once('listening', () => {
        listenCount ++;
        if(listenCount == ports.length){
          debug('spawn worker * ' + workrCount);
          for(let i = 0; i < workrCount; i++){
            this.spawnWorker(ports);
          }
        }
        this.emit('listening', port);
      });
      this.netServers[port] = netServer;
    })
  })
}
util.inherits(Master, EventEmiter);
module.exports = Master;

Master.prototype.listen = function(){
  Object.keys(this.netServers).forEach((port) => {
    this.netServers[port].listen(port);
  })
};

Master.prototype.hash = function hash(ip) {
  var hash = this.seed;
  for (var i = 0; i < ip.length; i++) {
    var num = ip[i];

    hash += num;
    hash %= 2147483648;
    hash += (hash << 10);
    hash %= 2147483648;
    hash ^= hash >> 6;
  }

  hash += hash << 3;
  hash %= 2147483648;
  hash ^= hash >> 11;
  hash += hash << 15;
  hash %= 2147483648;

  return hash >>> 0;
};

Master.prototype.spawnWorker = function spawnWorker(ports) {
  var worker = cluster.fork(this.env);

  var self = this;
  worker.on('exit', function(code) {
    debug('worker=%d died with code=%d', worker.process.pid, code);
    self.respawn(ports, worker);
  });

  worker.on('message', function(msg) {
    // Graceful exit
    if (msg.type === 'close')
      self.respawn(ports, worker);
  });

  debug('worker=%d spawn', worker.process.pid);
  //this.workers.push(worker);
  let port = ports[0];
  let portWorkers = this.workers[port] || [];
  portWorkers.push(worker);
  ports.forEach((i) => {
    this.workers[i] = portWorkers;
  });
};

Master.prototype.respawn = function respawn(ports, worker) {
  var index = this.workers[ports[0]].indexOf(worker);
  if (index !== -1)
    this.workers[ports[0]].splice(index, 1);
  this.spawnWorker(ports);
};

Master.prototype.balance = function balance() {
  let self = this;
  return function(socket) {
    var addr = ip.toBuffer(socket.remoteAddress || '127.0.0.1');
    var port = socket.localPort;
    var hash = self.hash(addr);

    debug('balacing connection %j:%d', addr, port);
    let workerPool = self.workers[port];
    workerPool[(hash+port) % workerPool.length].send('sticky:balance', socket);
  };

};
