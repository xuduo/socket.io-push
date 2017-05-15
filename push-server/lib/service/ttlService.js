module.exports = (io, mongo, protocolVersion, stats, arrivalStats) => {
  return new TTLService(io, mongo, protocolVersion, stats, arrivalStats);
};

const logger = require('winston-proxy')('TTLService');
const randomstring = require("randomstring");
const maxTllPacketPerTopic = -10;

class TTLService {

  constructor(io, mongo, protocolVersion, stats, arrivalStats) {
    this.mongo = mongo;
    this.io = io;
    this.protocolVersion = protocolVersion || 1;
    this.stats = stats;
    this.arrivalStats = arrivalStats;
  }

  onPushId(socket, lastPacketId) {
    this.getPackets(socket.pushId, lastPacketId, socket, true);
  }

  addTTL(topic, event, timeToLive = 0, packet, unicast) {
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
      data.timestampValid = Date.now() + timeToLive;
      data.event = event;
      this.mongo.ttl.findByIdAndUpdate(topic, {
        $push: {
          "packets": JSON.stringify(data),
          $slice: maxTllPacketPerTopic
        },
      }, {
        upsert: true
      }, (err, doc) => {
        if (!err && doc) {
          if (!doc.expireAt || doc.expireAt < data.timeToLive) {
            doc.expireAt = data.timeToLive;
            doc.save();
          }
        }
        if (err) {
          logger.error("update ttl error", doc);
        }
      });

    }
  }

  getPackets(topic, lastId, socket, unicast) {
    if (lastId) {
      this.mongo.ttl.findById(topic, (err, ttl) => {
        if (!err && ttl) {
          const list = ttl.packets;
          if (list && list.length > 0) {
            var lastFound = false;
            var now = Date.now();

            list.forEach((packet) => {
              var jsonPacket = JSON.parse(packet);
              if (jsonPacket.id == lastId) {
                lastFound = true;
                logger.debug("lastFound %s %s", topic, lastId);
              } else if (lastFound == true && jsonPacket.timestampValid > now) {
                logger.debug("call emitPacket %s %s", jsonPacket.id, lastId);
                this.emitToSocket(socket, jsonPacket.event, jsonPacket);
                this.arrivalStats.addArrivalInfo(jsonPacket.id, {
                  target_android: 1
                });
              }
            });

            if (unicast) {
              this.mongo.ttl.findByIdAndRemove(topic);
            }

            if (!lastFound) {
              logger.debug('topic %s lastId %s not found send all packets', topic, lastId);
              list.forEach((packet) => {
                var jsonPacket = JSON.parse(packet);
                if (jsonPacket.timestampValid > now) {
                  this.emitToSocket(socket, jsonPacket.event, jsonPacket);
                  this.arrivalStats.addArrivalInfo(jsonPacket.id, {
                    target_android: 1
                  });
                }
              });
            }
          }
        }
      });
    }
  }

  emitPacket(topic, event, packet) {
    logger.debug("emitPacket %s %s %j", topic, event, packet);
    this.emitToSocket(this.io.to(topic), event, packet);
  }

  emitToSocket(socket, event, packet) {
    delete packet.event;
    delete packet.timestampValid;
    if (packet.timestamp) {
      packet.timestamp = Date.now();
    }
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
