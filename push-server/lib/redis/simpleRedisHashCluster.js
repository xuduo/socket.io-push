module.exports = SimpleRedisHashCluster;

var commands = require('redis-commands');
var IoRedis = require('ioredis');
var util = require("../util/util.js");
var logger = require('../log/index.js')('SimpleRedisHashCluster');

const REDIS_MASTER = 'master';    // ioreids use when fetch sentinel
const REDIS_SLAVE = 'slave';     // ioreids use when fetch sentinel

function SimpleRedisHashCluster(config) {
    if (!(this instanceof SimpleRedisHashCluster)) return new SimpleRedisHashCluster(config);
    this.messageCallbacks = [];
    this.write = getClientsFromIpList(config.write);
    this.read = getClientsFromIpList(config.read);
    this.event = getClientsFromIpList(config.event);
    if (this.read.length == 0) {
        logger.info("read slave not in config using write");
        this.read = this.write;
    }
    var self = this;

    this.sub = [];
    if (config.sub) {
        if (Array.isArray(config.sub)) {
            logger.debug("sub using direct redis", config.sub);
            this.sub = getClientsFromIpList(config.sub, this);
        } else {
            logger.debug("sub using sentinel", config.sub);
            this.sub = getClientsFromSentinel(config.sub.sentinel, config.sub.groupName, REDIS_SLAVE, this);
        }
    }

    this.pubs = [];
    if (config.pubs) {
        config.pubs.forEach(function (pub) {
            if (Array.isArray(pub)) {
                logger.debug("pub using direct redis", pub);
                self.pubs.push(getClientsFromIpList(pub));
            } else {
                logger.debug("pub using sentinel", pub);
                self.pubs.push(getClientsFromSentinel(pub.sentinel, pub.groupName, REDIS_MASTER));
            }
        });
    }
}

function getClientsFromSentinel(sentinels, names, role, subscribe) {
    var clients = [];
    if (names) {
        names.forEach(function (name) {
            var client = new IoRedis({
                sentinels: sentinels,
                name: name,
                role: role,
                retryStrategy: function (times) {
                    var delay = Math.min(times * 300, 2000);
                    return delay;
                },
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
            var client = new IoRedis({
                host: addr.host,
                port: addr.port,
                retryStrategy: function (times) {
                    var delay = Math.min(times * 300, 2000);
                    return delay;
                },
                connectTimeout: 10000000000000000
            });
            client.on("error", function (err) {
                logger.error("redis error", err);
            });
            if (subscribe) {
                client.on("messageBuffer", function (channel, message) {
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
        handleCommand(command, arguments, client);
    }

});

['publish'].forEach(function (command) {

    SimpleRedisHashCluster.prototype[command.toUpperCase()] = SimpleRedisHashCluster.prototype[command] = function (key, arg, callback) {
        if (key == "event#client") {
            var client = util.getByHash(this.event, key);
            handleCommand(command, arguments, client);
        } else {
            var args = arguments;
            this.pubs.forEach(function (pub) {
                var client = util.getByHash(pub, key);
                handleCommand(command, args, client);
            });
        }
    }

});

['subscribe', 'unsubscribe'].forEach(function (command) {

    SimpleRedisHashCluster.prototype[command.toUpperCase()] = SimpleRedisHashCluster.prototype[command] = function (key, arg, callback) {
        var client = util.getByHash(this.sub, key);
        handleCommand(command, arguments, client);
    }

});

['get', 'hkeys', 'hgetall', 'pttl', 'lrange'].forEach(function (command) {

    SimpleRedisHashCluster.prototype[command.toUpperCase()] = SimpleRedisHashCluster.prototype[command] = function (key, arg, callback) {
        var client = util.getByHash(this.read, key);
        handleCommand(command, arguments, client);
    }
});

function handleCommand(command, callArguments, client) {
    if (!client) {
        logger.error("handleCommand error no client %j", callArguments);
        return;
    }

    return client.callBuffer.apply(client, [command].concat(toArray(callArguments)));
}

SimpleRedisHashCluster.prototype.hash = function (key, callback) {
    var client = util.getByHash(this.read, key);
    callback({host: client.options.host, port: client.options.port});
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
    this.pubs.forEach(function (pub) {
        pub.forEach(function (master) {
            master.status !== 'ready' && masterError++;
        });
    });
    var slaveError = 0;
    this.sub.forEach(function (slave) {
        slave.status !== 'ready' && slaveError++;
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