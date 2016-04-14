'use strict';
module.exports = Sentinel;
var Redis = require('ioredis');
var logger = require('../log/index.js')('Sentinel');

function Sentinel(sentinels){
    this.sentinels = sentinels;
}

Sentinel.prototype.getMaster = function(masterName, callback){
    var sentinel = this.sentinels[0];
    var client = new Redis({
        host: sentinel.host,
        port: sentinel.port,
        connectTimeout: 3000
    });
    client.on('error', function(err){
        logger.error("sentinel[%s:%d]: %s", sentinel.host, sentinel.port, err);
    })
    client.sentinel('get-master-addr-by-name', masterName, function (err, result) {
        client.disconnect();
        if (err) {
            return callback(err);
        }
        callback(null, Array.isArray(result) ? { host: result[0], port: result[1] } : null);
    });
}

Sentinel.prototype.getSlave = function (masterName, callback) {
    var sentinel = this.sentinels[0];
    var client = new Redis({
        host: sentinel.host,
        port: sentinel.port,
        connectTimeout: 3000
    });
    client.on('error', function(err){
        logger.error("sentinel[%s:%d]: %s", sentinel.host, sentinel.port, err);
    })
    client.sentinel('slaves', masterName, function (err, result) {
        client.disconnect();
        if (err) {
            return callback(err);
        }
        var selectedSlave;
        if (Array.isArray(result)) {
            var availableSlaves = [];
            for (var i = 0; i < result.length; ++i) {
                var slave = packObject(result[i]);
                if (slave.flags && !slave.flags.match(/(disconnected|s_down|o_down)/)) {
                    availableSlaves.push(slave);
                }
            }
            if(availableSlaves.length > 0) {
                selectedSlave = availableSlaves[0];
            }
        }
        callback(null, selectedSlave ? { host: selectedSlave.ip, port: selectedSlave.port } : null);
    });
};

function packObject (array) {
    var result = {};
    var length = array.length;

    for (var i = 1; i < length; i += 2) {
        result[array[i - 1]] = array[i];
    }

    return result;
};
