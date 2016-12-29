module.exports = (io, redis, protocolVersion, stats, arrivalStats) => {
    return new TTLService(io, redis, protocolVersion, stats, arrivalStats);
};

const logger = require('winston-proxy')('TTLService');
const randomstring = require("randomstring");
const maxTllPacketPerTopic = -50;

class TTLService {

    constructor(io, redis, protocolVersion, stats, arrivalStats) {
        this.redis = redis;
        this.io = io;
        this.protocolVersion = protocolVersion || 1;
        this.stats = stats;
        this.arrivalStats = arrivalStats;
    }

    onPushId(socket, lastPacketId) {
        this.getPackets(socket.pushId, lastPacketId, socket, true);
    }

    addTTL(topic, event, timeToLive, packet, unicast) {
        if (!packet.id) {
            packet.id = randomstring.generate(12);
        }
        timeToLive = timeToLive || 0;
        logger.debug("addPacket %s %s %s", topic, event, timeToLive);
        packet.ttl = 1;
        packet.topic = topic;
        if (unicast) {
            packet.unicast = 1;
        }
        var data = JSON.parse(JSON.stringify(packet));
        data.timestampValid = Date.now() + timeToLive;
        data.event = event;
        var listKey = "ttl#packet#" + topic;
        if (timeToLive > 0) {
            this.redis.pttl(listKey, (err, oldTtl) => {
                logger.debug("addPacket key %s ,id %s, %d , %d", listKey, packet.id, oldTtl, timeToLive);
                this.redis.rpush(listKey, JSON.stringify(data));
                this.redis.ltrim(listKey, maxTllPacketPerTopic, -1);
                if (timeToLive > oldTtl) {
                    logger.debug("pexpire ", listKey);
                    this.redis.pexpire(listKey, timeToLive);
                }
            });
        }
    }

    getPackets(topic, lastId, socket, unicast) {
        if (lastId) {
            var listKey = "ttl#packet#" + topic;
            this.redis.lrange(listKey, 0, -1, (err, list) => {
                if (list && list.length > 0) {
                    var lastFound = false;
                    var now = Date.now();

                    list.forEach((packet) => {
                        var jsonPacket = JSON.parse(packet);
                        var now = Date.now();
                        if (jsonPacket.id == lastId) {
                            lastFound = true;
                            logger.debug("lastFound %s %s", topic, lastId);
                        } else if (lastFound == true && jsonPacket.timestampValid > now) {
                            logger.debug("call emitPacket %s %s", jsonPacket.id, lastId);
                            this.emitToSocket(socket, jsonPacket.event, jsonPacket);
                            this.arrivalStats.addPacketInfo(jsonPacket.id, 'target', 1);
                        }
                    });

                    if (unicast) {
                        this.redis.del("ttl#packet#" + topic);
                    }

                    if (!lastFound) {
                        logger.debug('topic %s lastId %s not found send all packets', topic, lastId);
                        list.forEach((packet) => {
                            var jsonPacket = JSON.parse(packet);
                            if (jsonPacket.timestampValid > now) {
                                this.emitToSocket(socket, jsonPacket.event, jsonPacket);
                                this.arrivalStats.addPacketInfo(jsonPacket.id, 'target', 1);
                            }
                        });
                    }
                }
            });
        }
    }

    emitPacket(topic, event, packet) {
        this.emitToSocket(this.io.to(topic), event, packet);
    }

    emitToSocket(socket, event, packet) {
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

}