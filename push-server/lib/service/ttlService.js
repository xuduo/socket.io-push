module.exports = TTLService;

var logger = require('../log/index.js')('TTLService');
var randomstring = require("randomstring");

function TTLService(redis) {
    if (!(this instanceof TTLService)) return new TTLService(redis);
    this.redis = redis;
}

TTLService.prototype.onPushId = function (socket, lastPacketId) {
    this.getPackets(socket.pushId, lastPacketId, socket, true);
}

var maxTllPacketPerTopic = -50;

TTLService.prototype.addPacketAndEmit = function (topic, event, timeToLive, packet, io, unicast) {
    if (event == "noti") {
        packet.id = randomstring.generate(12);
        packet.timestamp = Date.now();
    }
    if (timeToLive > 0) {
        packet.id = randomstring.generate(12);
        logger.debug("addPacket %s %s %s", topic, event, timeToLive);
        packet.ttl = 1;
        if (unicast) {
            packet.unicast = 1;
        }
        var data = JSON.parse(JSON.stringify(packet));
        var redis = this.redis;
        data.timestampValid = Date.now() + timeToLive;
        data.event = event;
        var listKey = "ttl#packet#" + topic;
        redis.pttl(listKey, function (err, oldTtl) {
            logger.debug("addPacket key %s ,id %s, %d , %d", listKey, packet.id, oldTtl, timeToLive);
            redis.rpush(listKey, JSON.stringify(data));
            redis.ltrim(listKey, maxTllPacketPerTopic, -1);
            if (timeToLive > oldTtl) {
                redis.pexpire(listKey, timeToLive);
            }
        });
    }
    io.to(topic).emit(event, packet);
};

TTLService.prototype.getPackets = function (topic, lastId, socket, unicast) {
    if (lastId || unicast) {
        var redis = this.redis;
        var listKey = "ttl#packet#" + topic;
        redis.lrange(listKey, 0, -1, function (err, list) {
            if (list && list.length > 0) {
                var lastFound = false;
                var now = Date.now();
                var i = 0;
                list.forEach(function (packet) {
                    var jsonPacket = JSON.parse(packet);
                    var now = Date.now();
                    if (jsonPacket.id == lastId) {
                        lastFound = true;
                        logger.debug("lastFound %s %s", topic, lastId);
                    } else if (lastFound == true && jsonPacket.timestampValid > now) {
                        logger.debug("call emitPacket %s %s", jsonPacket.id, lastId);
                        emitPacket(socket, jsonPacket);
                    }
                });

                if (unicast) {
                    redis.del("ttl#packet#" + topic);
                }

                if (!lastFound) {
                    logger.debug('topic %s lastId %s not found send all packets', topic, lastId);
                    list.forEach(function (packet) {
                        var jsonPacket = JSON.parse(packet);
                        if (jsonPacket.timestampValid > now) {
                            emitPacket(socket, jsonPacket)
                        }
                    });
                }
            }
        });
    }
};

function emitPacket(socket, packet) {
    var event = packet.event;
    delete packet.event;
    delete packet.timestampValid;
    logger.debug("emitPacket %s %j", event, packet);
    socket.emit(event, packet);
}