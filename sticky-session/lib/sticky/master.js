'use strict';

var cluster = require('cluster');
var EventEmiter = require('events').EventEmitter;
var util = require('util');
var net = require('net');
var ip = require('ip');

var debug = require('debug')('sticky:master');

function Master(ports, workerCount, env) {

  this.env = env || {};
  this.seed = (Math.random() * 0xffffffff) | 0;
  this.workers = [];
  this.netServers = {};
  let listenCount = 0;
  ports.forEach((port) => {
    let netServer = net.Server.call(this, {
      pauseOnConnect: true
    }, this.balance.apply(this, arguments));
    netServer.once('listening', () => {
      listenCount ++;
      if(listenCount == ports.length){
        for(let i = 0; i < workerCount; i++){
          this.spawnWorker();
        }
      }
      this.emit('listening', port);
    });
    this.netServers[port] = netServer;
  });
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

Master.prototype.spawnWorker = function spawnWorker() {
  var worker = cluster.fork(this.env);

  var self = this;
  worker.on('exit', function(code) {
    debug('worker=%d died with code=%d', worker.process.pid, code);
    self.respawn(worker);
  });

  worker.on('message', function(msg) {
    // Graceful exit
    if (msg.type === 'close')
      self.respawn(worker);
  });

  debug('worker=%d spawn', worker.process.pid);
  this.workers.push(worker);
};

Master.prototype.respawn = function respawn(worker) {
  var index = this.workers.indexOf(worker);
  if (index !== -1)
    this.workers.splice(index, 1);
  this.spawnWorker();
};

Master.prototype.balance = function balance() {
  let self = this;
  return function(socket) {
    var addr = ip.toBuffer(socket.remoteAddress || '127.0.0.1');
    var port = socket.localPort;
    var hash = self.hash(addr);

    debug('balacing connection %j:%d', addr, port);
    self.workers[hash % self.workers.length].send('sticky:balance', socket);
  };

};
