var expect = require('expect.js');
var redis = require('ioredis');
var io = require('socket.io');
var ioc = require('socket.io-client');
var redisAdapter = require('../adapter');
var http = require('http').Server;
var ioe = require('../emitter');

function client(srv, nsp, opts){
    if ('object' == typeof nsp) {
        opts = nsp;
        nsp = null;
    }
    var addr = srv.address();
    if (!addr) addr = srv.listen().address();
    var url = 'http://localhost:' + addr.port + (nsp || '');
    return ioc(url, opts);
}

describe('emitter', function() {
    //ignore namespace test

    describe('emit to room', function(){
        it('should be able to emit to a room', function(done){
            var pub = new RedisClient();
            var sub = new RedisClient(true);
            var srv = http();
            var sio = io(srv, {adapter: redisAdapter({pubClient: pub, subClient: sub})});

            var secondConnecting = false;
            srv.listen(function() {
                sio.on('connection', function(socket) {
                    if (secondConnecting) {
                        socket.join('exclusive room');
                    } else {
                        secondConnecting = true;
                    }

                    socket.on('broadcast event', function(payload) {
                        socket.emit('broadcast event', payload);
                    });
                });
            });

            var a = client(srv, { forceNew: true });
            a.on('broadcast event', function(payload) {
                expect().fail();
            });

            var b;
            a.on('connect', function() {
                b = client(srv, { forceNew: true });

                b.on('broadcast event', function(payload) {
                    expect(payload).to.be('broadcast payload');
                    setTimeout(done, 1000);
                });

                b.on('connect', function() {
                    var emitter = ioe(new redis());
                    emitter.to('exclusive room').broadcast.emit('broadcast event', 'broadcast payload');
                });
            });
        });

        //ignore emitter by socket id, actually it is prevent by adapter
    });

    function RedisClient(isSub){
        if(! (this instanceof RedisClient)) return new RedisClient(isSub);
        this.messageCallbacks = [];
        this.client = new redis();
        if(isSub){
            this.client.on("messageBuffer", (channel, message) => {
                this.messageCallbacks.forEach((callback) => {
                    callback(channel, message);
                });
            });
        }
    }
    RedisClient.prototype.on = function(message, callback){
        if(message == "message"){
            this.messageCallbacks.push(callback);
        }
    };
    ["publish", "subscribe", "unsubscribe"].forEach((command) => {
        RedisClient.prototype[command.toUpperCase()] = RedisClient.prototype[command] = function(key, arg, callback){
            return this.client.callBuffer.apply(this.client, [command].concat(arguments));
        };
    })

});
