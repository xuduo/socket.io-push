module.exports = SimpleRedisHashCluster;

var commands = require('redis-commands');
var redis = require('redis');
var IoRedis = require('ioredis');
var util = require("../util/util.js");
var logger = require('../log/index.js')('SimpleRedisHashCluster');
var useSentinel = false;

function SimpleRedisHashCluster(config, completeCallback) {
    this.messageCallbacks = [];
    this.write = getClientsFromIpList(config.write);
    this.read = getClientsFromIpList(config.read);
    if (this.read.length == 0) {
        logger.info("read slave not in config using write");
        this.read = this.write;
    }
    var self = this;

    if (config.sentinel){
        useSentinel = true;
        this.sub = getClientsFromSentinel(config.sentinel.sub, config.sentinel.masters, this);
        this.pubs = [];

        if (config.sentinel.pubs) {
            config.sentinel.pubs.forEach(function (pub) {
                self.pubs.push(getClientsFromSentinel(pub, config.sentinel.masters));
            });
        }
        completeCallback(this);
        return;
    }
    this.sub = getClientsFromIpList(config.sub, this);
    this.pubs = [];
    
    if (config.pubs) {
        config.pubs.forEach(function (pub) {
            self.pubs.push(getClientsFromIpList(pub));
        });
    }
    completeCallback(this);
}

function getClientsFromSentinel(sentinels, names, subscribe){
    var clients = [];
    if (names) {
        names.forEach(function (name) {
            var role = 'master';
            if (subscribe){role = 'slave';}
            var client = new IoRedis({
                sentinels : sentinels,
                name : name,
                role : role,
                connectTimeout: 10000000000000000
            });
            client.on("error", function (err) {
                logger.error("pub/sub redis error %s", err);
            });
            if (subscribe) {
                client.on("messageBuffer", function (channel, message) {
                    subscribe.messageCallbacks.forEach(function (callback) {
                        try {
                            callback(channel, message);
                        } catch (err) {
                            logger.error("pub/sub redis message error %s", err);
                        }
                    });
                });
            }
            clients.push(client);
        });
    }
    return clients;
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
                logger.error("store redis error %s", err);
            });
            if (subscribe) {
                client.on("message", function (channel, message) {
                    subscribe.messageCallbacks.forEach(function (callback) {
                        try {
                            callback(channel, message);
                        } catch (err) {
                            logger.error("store redis message error %s", err);
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
        var args = arguments;
        this.pubs.forEach(function (pub) {
            var client = util.getByHash(pub, key);
            if(useSentinel){
                handleIoRedisCommand(command, args, key, arg, callback, client);
            }else{
                handleCommand(command, args, key, arg, callback, client);
            }
        });
    }

});

['subscribe', 'unsubscribe'].forEach(function (command) {

    SimpleRedisHashCluster.prototype[command.toUpperCase()] = SimpleRedisHashCluster.prototype[command] = function (key, arg, callback) {
        var client = util.getByHash(this.sub, key);
        if(useSentinel){
            handleIoRedisCommand(command, arguments, key, arg, callback, client);
        }else {
            handleCommand(command, arguments, key, arg, callback, client);
        }
    }

});

['get', 'hkeys', 'hgetall', 'pttl', 'lrange'].forEach(function (command) {

    SimpleRedisHashCluster.prototype[command.toUpperCase()] = SimpleRedisHashCluster.prototype[command] = function (key, arg, callback) {
        var client = util.getByHash(this.read, key);
        handleCommand(command, arguments, key, arg, callback, client);
    }

});

function handleIoRedisCommand(command, callArguments, key, arg, callback, client) {
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
        return client.send_command(command, key, arg);
    }
    if (len === 3) {
        return client.send_command(command, key, arg, callback);
    }
    return client.send_command.apply(client, [command].concat(toArray(callArguments)));
}

function handleCommand(command, callArguments, key, arg, callback, client) {
    if (!client) {
        logger.error("handleCommand error ", command, key);
        return;
    }

    logger.debug("%s:%s", command, key);

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

// #TODO ioreids not connection_options property
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