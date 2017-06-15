module.exports = (io, mongo, stats, arrivalStats) => {
  return new TTLService(io, mongo, stats, arrivalStats);
};

const logger = require('winston-proxy')('TTLService');
const randomstring = require("randomstring");
const maxTllPacketPerTopic = -10;

class TTLService {

  constructor(io, mongo, stats, arrivalStats) {
    this.mongo = mongo;
    this.io = io;
    this.stats = stats;
    this.arrivalStats = arrivalStats;
    this.type = 'TTLService';
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
      packet.timestampValid = Date.now() + timeToLive;
      packet.event = event;
      this.mongo.ttl.findByIdAndUpdate(topic, {
        $setOnInsert: {
          expireAt: packet.timestampValid
        },
        $push: {
          packetsMixed: {
            $each: [packet],
            $slice: maxTllPacketPerTopic
          }
        },
      }, {
        upsert: true
      }, (err, doc) => {
        if (!err && doc) {
          if (!doc.expireAt || doc.expireAt < packet.timestampValid) {
            doc.expireAt = packet.timestampValid;
            doc.save();
          }
        }
        if (err) {
          logger.error("update ttl error", err);
        }
      });

    }
  }

  getPackets(topic, lastId, socket, unicast) {
    if (lastId) {
      this.mongo.ttl.findById(topic, (err, ttl) => {
        if (!err && ttl) {
          const list = ttl.packetsMixed;
          if (list && list.length > 0) {
            var lastFound = false;
            var now = Date.now();

            list.forEach((packet) => {
              if (packet.id == lastId) {
                lastFound = true;
                logger.debug("lastFound %s %s", topic, lastId);
              } else if (lastFound == true && packet.timestampValid > now) {
                logger.debug("call emitPacket %s %s", packet.id, lastId);
                this.emitToSocket(socket, packet.event, packet);
                this.arrivalStats.addArrivalInfo(packet.id, {
                  target_android: 1
                });
              }
            });

            if (unicast) {
              this.mongo.ttl.remove({
                _id: topic
              });
            }

            if (!lastFound) {
              logger.debug('topic %s lastId %s not found send all packets', topic, lastId);
              list.forEach((packet) => {
                if (packet.timestampValid > now) {
                  this.emitToSocket(socket, packet.event, packet);
                  this.arrivalStats.addArrivalInfo(packet.id, {
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
    if (event == "push") {
      if (packet.ttl) {
        socket.emit("p", packet.j, [packet.topic, packet.id, packet.unicast || 0]);
      } else {
        socket.emit("p", packet.j);
      }
    } else {
      socket.emit(event, packet);
    }
  }

  sendAll(notification, timeToLive) {
    this.arrivalStats.addPushAll(notification, timeToLive);
    this.addTTL("noti", 'noti', timeToLive, notification, false);
    // 小米,华为,苹果不订阅 "noti"
    this.emitPacket("noti", 'noti', notification);
  }

  sendMany() {

  }

}
