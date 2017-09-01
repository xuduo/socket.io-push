var http = require('http').Server;
var io = require('socket.io');
var ioc = require('socket.io-client');
var expect = require('expect.js');
var redis = require('ioredis');
var adapter = require('../adapter.js');

describe('socket.io-redis', function() {

  it('broadcasts to rooms', function(done) {
    create(function(server1, client1) {
      create(function(server2, client2) {
        create(function(server3, client3) {
          create(function(server4, client4) {
            server1.on('connection', function(c1) {
              c1.join('woot');
            });

            server2.on('connection', function(c2) {
              // does not join, performs broadcast
              c2.on('do broadcast', function() {
                c2.broadcast.to('woot').emit('broadcast');
              });
            });

            server3.on('connection', function(c3) {
              // does not join, signals broadcast
              client2.emit('do broadcast');
            });

            server4.on('connection', function(c4) {
              c4.join('woot');
            });

            client1.on('broadcast', function() {
              client1.disconnect();
              client2.disconnect();
              client3.disconnect();
              client4.disconnect()
              setTimeout(done, 100);
            });

            client2.on('broadcast', function() {
              throw new Error('Not in room');
            });

            client3.on('broadcast', function() {
              throw new Error('Not in room');
            });
          });
        });
      });
    });
  });

  it('doesn\'t broadcast to left rooms', function(done) {
    create(function(server1, client1) {
      create(function(server2, client2) {
        create(function(server3, client3) {
          server1.on('connection', function(c1) {
            c1.join('woot');
            c1.leave('woot');
          });

          server2.on('connection', function(c2) {
            c2.on('do broadcast', function() {
              c2.broadcast.to('woot').emit('broadcast');

              setTimeout(function() {
                client1.disconnect();
                client2.disconnect();
                client3.disconnect();
                done();
              }, 100);
            });
          });

          server3.on('connection', function(c3) {
            client2.emit('do broadcast');
          });

          client1.on('broadcast', function() {
            throw new Error('Not in room');
          });
        });
      });
    });
  });

  it('deletes rooms upon disconnection', function(done) {
    create(function(server, client) {
      server.on('connection', function(c) {
        c.join('woot');
        c.on('disconnect', function() {
          expect(c.adapter.sids[c.id]).to.be.empty();
          expect(c.adapter.rooms).to.be.empty();
          client.disconnect();
          done();
        });
        c.disconnect();
      });
    });
  });

  // create a pair of socket.io server+client
  function create(nsp, fn) {
    var srv = http();
    var sio = io(srv);
    sio.adapter(adapter({
      pubClient: new RedisClient(),
      subClient: new RedisClient(true)
    }));
    srv.listen(function(err) {
      if (err) throw err; // abort tests
      if ('function' == typeof nsp) {
        fn = nsp;
        nsp = '';
      }
      nsp = nsp || '/';
      var addr = srv.address();
      var url = 'http://localhost:' + addr.port + nsp;
      fn(sio.of(nsp), ioc(url));
    });
  }

  function RedisClient(isSub) {
    if (!(this instanceof RedisClient)) return new RedisClient(isSub);
    this.messageCallbacks = [];
    this.client = new redis();
    if (isSub) {
      this.client.on("messageBuffer", (channel, message) => {
        this.messageCallbacks.forEach((callback) => {
          callback(channel, message);
        });
      });
    }
  }
  RedisClient.prototype.on = function(message, callback) {
    if (message == "message") {
      this.messageCallbacks.push(callback);
    }
  };
  ["publish", "subscribe", "unsubscribe"].forEach((command) => {
    RedisClient.prototype[command.toUpperCase()] = RedisClient.prototype[command] = function(key, arg, callback) {
      return this.client.callBuffer.apply(this.client, [command].concat(arguments));
    };
  })

});
