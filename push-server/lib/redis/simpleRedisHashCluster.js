module.exports = SimpleRedisHashCluster;

var commands = require('redis-commands');
var redis = require('redis');
var util = require("../util/util.js");
var Sentinel = require("./sentinel.js");
var logger = require('../log/index.js')('SimpleRedisHashCluster');


function SimpleRedisHashCluster(config, completeCallback) {
    this.messageCallbacks = [];
    this.write = getClientsFromIpList(config.write);
    this.read = getClientsFromIpList(config.read);
    if (this.read.length == 0) {
        logger.info("read slave not in config using write");
        this.read = this.write;
    }

    if (config.sentinel){
        this.pubs = [];
        this.sub = [];
        var _this = this;
        var masterNames = config.sentinel.masters;
        var completeCnt = 0;
        config.sentinel.sentinels.forEach(function(sentinelAddrs,i){
            var senIndex = i;
            sentinel = new Sentinel(sentinelAddrs,masterNames,config.ipMap);
            _this.pubs[senIndex] = [];
            sentinel.on("create_client",function(masterName,clientType,client){
                var clientAddr = client.connection_options.host + ":" + client.connection_options.port;
                logger.debug("[replica %d][%s][%s][%s] enable",senIndex, masterName, clientType, clientAddr);
                masterNames.forEach(function(name,n){
                    if (name === masterName){
                        if (clientType === 'master'){
                            _this.pubs[senIndex][n] = client;
                        }
                        if(clientType === 'slave' && senIndex == 0){
                            _this.sub[n] = client;
                        }
                    }
                })
            });
            sentinel.on('complete',function(sentinelAddr){
                logger.debug("sentinel %j commplete callback", sentinelAddr);
                completeCnt++;
                if(completeCnt === config.sentinel.sentinels.length){
                    var pubsInfo = [];
                    _this.pubs.forEach(function(p,i){
                        pubsInfo[i] = [];
                        p.forEach(function(c,j){
                            pubsInfo[i][j] = c.connection_options.host + ":" + c.connection_options.port;
                        });
                    });
                    var subInfo = [];
                    _this.sub.forEach(function(c,i){
                        subInfo[i] = c.connection_options.host + ":" + c.connection_options.port;
                    });
                    logger.info("sentinel init complete pubs: %j",pubsInfo);
                    logger.info("sentinel init complete sub: %j",subInfo);

                    _this.sub.forEach(function(client) {
                        client.on("message", function (channel, message) {
                            _this.messageCallbacks.forEach(function (callback) {
                                try {
                                    callback(channel, message);
                                } catch (err) {
                                    logger.error("redis message error %s", err);
                                }
                            });
                        });
                    });
                    completeCallback(_this);
                }
            });
        });
        return;
    }
    this.sub = getClientsFromIpList(config.sub, this);
    this.pubs = [];
    var self = this;
    if (config.pubs) {
        config.pubs.forEach(function (pub) {
            self.pubs.push(getClientsFromIpList(pub));
        });
    }
    completeCallback(this);
}

function getClientsFromIpList(addrs, subscribe) {
    var clients = [];
    if (addrs) {
        addrs.forEach(function (addr) {
            var client = redis.createClient({
                host: addr.host,
                port: addr.port,
                return_buffers: true,
                retry_max_delay: 3000,
                max_attempts: 0,
                connect_timeout: 10000000000000000
            });
            client.on("error", function (err) {
                logger.error("redis error %s", err);
            });
            if (subscribe) {
                client.on("message", function (channel, message) {
                    subscribe.messageCallbacks.forEach(function (callback) {
                        try {
                            callback(channel, message);
                        } catch (err) {
                            logger.error("redis message error %s", err);
                        }
                    });
                });
            }
            clients.push(client);
        });
    }
    return clients;
}

commands.list.forEach(function (command) {

    SimpleRedisHashCluster.prototype[command.toUpperCase()] = SimpleRedisHashCluster.prototype[command] = function (key, arg, callback) {
        var client = util.getByHash(this.write, key);
        handleCommand(command, arguments, key, arg, callback, client);
    }

});

['publish'].forEach(function (command) {

    SimpleRedisHashCluster.prototype[command.toUpperCase()] = SimpleRedisHashCluster.prototype[command] = function (key, arg, callback) {
        this.pubs.forEach(function (pub) {
            var client = util.getByHash(pub, key);
            handleCommand(command, arguments, key, arg, callback, client);
        });
    }

});

['subscribe', 'unsubscribe'].forEach(function (command) {

    SimpleRedisHashCluster.prototype[command.toUpperCase()] = SimpleRedisHashCluster.prototype[command] = function (key, arg, callback) {
        var client = util.getByHash(this.sub, key);
        handleCommand(command, arguments, key, arg, callback, client);
    }

});

['get', 'hkeys', 'hgetall', 'pttl', 'lrange'].forEach(function (command) {

    SimpleRedisHashCluster.prototype[command.toUpperCase()] = SimpleRedisHashCluster.prototype[command] = function (key, arg, callback) {
        var client = util.getByHash(this.read, key);
        handleCommand(command, arguments, key, arg, callback, client);
    }

});

function handleCommand(command, callArguments, key, arg, callback, client) {
    if (!client) {
        logger.error("handleCommand error ", command, key);
        return;
    }

    if (Array.isArray(arg)) {
        arg = [key].concat(arg);
        return client.send_command(command, arg, callback);
    }
    // Speed up the common case
    var len = callArguments.length;
    if (len === 2) {
        return client.send_command(command, [key, arg]);
    }
    if (len === 3) {
        return client.send_command(command, [key, arg, callback]);
    }
    return client.send_command(command, toArray(callArguments));
}

SimpleRedisHashCluster.prototype.hash = function (key, callback) {
    var client = util.getByHash(this.readSlaves, key);
    callback({host: client.connection_options.host, port: client.connection_options.port});
}


SimpleRedisHashCluster.prototype.on = function (message, callback) {
    if (message === "message") {
        this.messageCallbacks.push(callback);
    } else {
        var err = "on " + message + " not supported";
        logger.error(error);
        throw err;
    }
}


SimpleRedisHashCluster.prototype.status = function () {
    var masterError = 0;
    this.masters.forEach(function (master) {
        !master.ready && masterError++;
    });
    var slaveError = 0;
    this.subSlaves.forEach(function (slave) {
        !slave.ready && slaveError++;
    });
    return {masterError: masterError, slaveError: slaveError};
}

function toArray(args) {
    var len = args.length,
        arr = new Array(len), i;

    for (i = 0; i < len; i += 1) {
        arr[i] = args[i];
    }

    return arr;
}
