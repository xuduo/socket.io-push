module.exports = TTLService;

var logger = require('winston-proxy')('TTLService');
var randomstring = require("randomstring");

function TTLService(io, redis, protocolVersion, stats) {
    if (!(this instanceof TTLService)) return new TTLService(io, redis, protocolVersion, stats);
    this.redis = redis;
    this.io = io;
    this.protocolVersion = protocolVersion || 1;
    this.stats = stats;
}

TTLService.prototype.onPushId = function (socket, lastPacketId) {
    this.getPackets(socket.pushId, lastPacketId, socket, true);
}

var maxTllPacketPerTopic = -50;

TTLService.prototype.addTTL = function (topic, event, timeToLive, packet, unicast) {
    if (timeToLive > 0) {
        if (!packet.id) {
            packet.id = randomstring.generate(12);
        }
        logger.debug("addPacket %s %s %s", topic, event, timeToLive);
        packet.ttl = 1;
        packet.topic = topic;
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
        if (topic == 'noti') {
            logger.debug("noti reach rate stats, id: ", data.id);
            let statsPacket = {};
            statsPacket.id = data.id;
            statsPacket.title = data.android.title;
            statsPacket.message = data.android.message;
            statsPacket.timeStart = new Date().toLocaleString();
            statsPacket.timeValid = new Date(data.timestampValid).toLocaleString();
            statsPacket.ttl = timeToLive;
            this.stats.addPacketToReachRate(statsPacket, Date.now(), timeToLive);
        }
    }
};

TTLService.prototype.getPackets = function (topic, lastId, socket, unicast) {
    if (lastId) {
        var listKey = "ttl#packet#" + topic;
        var self = this;
        self.redis.lrange(listKey, 0, -1, function (err, list) {
            if (list && list.length > 0) {
                var lastFound = false;
                var now = Date.now();

                list.forEach(function (packet) {
                    var jsonPacket = JSON.parse(packet);
                    var now = Date.now();
                    if (jsonPacket.id == lastId) {
                        lastFound = true;
                        logger.debug("lastFound %s %s", topic, lastId);
                    } else if (lastFound == true && jsonPacket.timestampValid > now) {
                        logger.debug("call emitPacket %s %s", jsonPacket.id, lastId);
                        self.emitToSocket(socket, jsonPacket.event, jsonPacket);
                    }
                });

                if (unicast) {
                    self.redis.del("ttl#packet#" + topic);
                }

                if (!lastFound) {
                    logger.debug('topic %s lastId %s not found send all packets', topic, lastId);
                    list.forEach(function (packet) {
                        var jsonPacket = JSON.parse(packet);
                        if (jsonPacket.timestampValid > now) {
                            self.emitToSocket(socket, jsonPacket.event, jsonPacket)
                        }
                    });
                }
            }
        });
    }
};

TTLService.prototype.emitPacket = function (topic, event, packet) {
    this.emitToSocket(this.io.to(topic), event, packet);
}

TTLService.prototype.emitToSocket = function (socket, event, packet) {
    delete packet.event;
    delete packet.timestampValid;
    if (packet.timestamp) {
        packet.timestamp = Date.now();
    }
    logger.debug("emitPacket %s %j", event, packet);
    if (this.protocolVersion > 1 && event == "push") {
        if (packet.ttl) {
            socket.emit("p", packet.j, [packet.topic, packet.id, packet.unicast || 0]);
        } else {
            socket.emit("p", packet.j);
        }
    } else {
        socket.emit(event, packet);
    }
}