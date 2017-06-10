module.exports = (io, stats, packetService, deviceService, ttlService, arrivalStats, config) => {
  return new ProxyServer(io, stats, packetService, deviceService, ttlService, arrivalStats, config);
};
const logger = require('winston-proxy')('ProxyServer');
const http = require('http');

class ProxyServer {

  constructor(io, stats, packetService, deviceService, ttlService, arrivalStats, config) {
    this.io = io;

    io.on('connection', (socket) => {

      socket.on('disconnect', (reason) => {
        logger.debug("disconnect by transport, pushId: %s, socketId:%s, reason: %s", socket.pushId, socket.id, reason);
        stats.removeSession();
        stats.removePlatformSession(socket.platform);
        if (socket.pushId) {
          let disconnectDelay = 0;
          if (reason != 'ping timeout' && config.disconnect_delay) {
            disconnectDelay = config.disconnect_delay || 10000;
          }
          setTimeout(() => {
            deviceService.disconnect(socket, (ret) => {
              if (ret) {
                if (packetService) {
                  logger.debug("publishDisconnect pushId:%s, socketId:%s", socket.pushId, socket.id);
                  packetService.publishDisconnect(socket);
                }
              }
            })
          }, disconnectDelay);
        }
      });

      const oldPacket = socket.packet;
      socket.packet = (packet, preEncoded) => {
        if (stats.shouldDrop()) {
          return;
        }
        stats.onPacket();
        oldPacket.call(socket, packet, preEncoded);
      };

      socket.authJoin = (topic, callback) => {
        if (topic.startsWith("uid:")) {
          logger.warn("topic.startsWith(uid:) skip");
          callback();
          return;
        }
        socket.join(topic, callback);
      };

      socket.setUid = (uid, callback) => {
        if (uid) {
          socket.uid = uid;
          socket.join("uid:" + uid, callback);
        } else if (socket.uid) {
          socket.leave("uid:" + socket.uid, callback);
          socket.uid = uid;
        }
      };

      socket.on('pushId', (data) => {
        if (data.id && data.id.length >= 10) {
          logger.debug("on pushId %j socketId", data, socket.id);
          socket.pushId = data.id;
          const topics = data.topics;

          if (topics && topics.length > 0) {
            topics.forEach((topic) => {
              socket.authJoin(topic);
            });
            socket.topics = topics;
          }

          if (data.platform) {
            data.platform = data.platform.toLowerCase();
            socket.platform = data.platform;
          }

          stats.addPlatformSession(socket.platform);

          socket.authJoin(data.id, (err) => {
            if (err) {
              logger.error("join pushId room fail %s", err);
              return;
            }
            deviceService.connect(data, socket.id, (device) => {
              const reply = {
                id: data.id
              };
              if (device.tags && device.tags.length) {
                reply.tags = device.tags;
              }

              if (device.token) {
                reply.token = device.token;
              }

              if (device.uid) {
                reply.uid = device.uid;
                socket.setUid(device.uid, () => {
                  socket.emit('pushId', reply);
                });
              } else {
                socket.emit('pushId', reply);
              }

              if (packetService) {
                packetService.publishConnect(socket);
              }


              const lastPacketIds = data.lastPacketIds;
              if (lastPacketIds) {
                for (const topic in lastPacketIds) {
                  ttlService.getPackets(topic, lastPacketIds[topic], socket);
                }
              }
              ttlService.onPushId(socket, data.lastUnicastId);
            });
          });
        }
      });

      socket.on('addTag', (data) => {
        if (socket.pushId && data.tag) {
          deviceService.addTag(socket.pushId, data.tag);
        }
      });

      socket.on('setTags', (data) => {
        logger.debug('setTags ', socket.pushId, data);
        if (socket.pushId && data) {
          deviceService.setTags(socket.pushId, data);
        }
      });

      socket.on('removeTag', (data) => {
        if (socket.pushId && data.tag) {
          deviceService.removeTag(socket.pushId, data.tag);
        }
      });

      socket.on('subscribeTopic', (data) => {
        logger.debug("on subscribeTopic %j, pushId %s", data, socket.pushId);
        const topic = data.topic;
        ttlService.getPackets(topic, data.lastPacketId, socket);
        socket.authJoin(topic);
      });

      socket.on('unsubscribeTopic', (data) => {
        logger.debug("on unsubscribeTopic %j, pushId %s", data, socket.pushId);
        const topic = data.topic;
        socket.leave(topic);
      });

      const token = (data) => {
        logger.debug("on token %s %j", socket.pushId, data);
        if (socket.pushId) {
          data.pushId = socket.pushId;
        }
        if (!data.type) {
          data.type = "apn";
        }
        if (data.apnToken) {
          data.token = data.apnToken;
          delete data.apnToken;
        }
        if (data.type == "apn") {
          data.token = data.token.replace(/[<> ]/g, ''); //replace all
        }
        deviceService.setToken(data);
      };
      socket.on('apnToken', token);
      socket.on('token', token);

      socket.on('packetProxy', (data) => {
        data.pushId = socket.pushId;
        if (socket.uid) {
          data.uid = socket.uid;
        }
        if (packetService) {
          packetService.publishPacket(data);
        }
      });

      socket.on('unbindUid', () => {
        socket.setUid(null);
        if (socket.pushId) {
          logger.debug('unbindUid pushId %s ', socket.pushId);
          deviceService.removePushId(socket.pushId, true);
        }
      });

      if (config.bindUid) {
        config.request = require('request');
        socket.on('bindUid', (data) => {
          if (config.bindUid && socket.pushId && data) {
            config.bindUid(data, (uid, platform, limit) => {
              logger.debug("bindUid %s %s %j", uid, socket.pushId, data);
              if (uid && socket.uid != uid) {
                socket.setUid(uid);
                deviceService.bindUid(socket.pushId, data.uid, platform || socket.platform, limit);
              }
            });
          }
        });
      }

      socket.on('notificationReply', (data) => {
        logger.debug("notificationReply ", data);
        stats.onNotificationReply(data.timestamp);
        arrivalStats.addArrivalInfo(data.id, {
          arrive_android: 1
        });
      });

      socket.on('umengReply', (data) => {
        logger.debug("umengReply ", data);
        arrivalStats.addArrivalInfo(data.id, {
          arrive_umeng: 1
        });
      });

      socket.on('notificationClick', (data) => {
        if (!data.type || data.type == 'umeng') {
          data.type = 'android'
        }
        arrivalStats.addArrivalInfo(data.id, {
          ['click_' + data.type]: 1
        });
      });

      stats.addSession(socket);
    });
  }

}
