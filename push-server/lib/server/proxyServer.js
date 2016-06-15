module.exports = ProxyServer;
var logger = require('../log/index.js')('ProxyServer');
var http = require('http');

function ProxyServer(io, stats, packetService, notificationService, uidStore, ttlService) {
    if (!(this instanceof ProxyServer)) return new ProxyServer(io, stats, packetService, notificationService, uidStore, ttlService);
    this.io = io;

    io.on('connection', function (socket) {

        socket.on('disconnect', function () {
            stats.removeSession();
            stats.removePlatformSession(socket.platform);
            if (socket.pushId) {
                logger.debug("publishDisconnect %s", socket.pushId);
                if (packetService) {
                    packetService.publishDisconnect(socket);
                }
            }
        });

        var oldPacket = socket.packet;
        socket.packet = function (packet, preEncoded) {
            if (stats.shouldDrop()) {
                return;
            }
            stats.onPacket();
            oldPacket.call(socket, packet, preEncoded);
        };

        socket.on('pushId', function (data) {
            if (data.id && data.id.length >= 10) {
                logger.debug("on pushId %j", data);
                if (data.platform) {
                    socket.platform = data.platform.toLowerCase();
                }
                stats.addPlatformSession(socket.platform);
                var topics = data.topics;
                if (topics && topics.length > 0) {
                    topics.forEach(function (topic) {
                        socket.join(topic);
                    });
                }
                socket.join(data.id, function (err) {
                    if (err) {
                        logger.error("join pushId room fail %s", err);
                        return;
                    }
                    uidStore.getUidByPushId(data.id, function (uid) {
                        var reply = {id: data.id};
                        if (uid) {
                            reply.uid = uid.toString();
                            socket.uid = uid;
                        }
                        socket.pushId = data.id;
                        if (packetService) {
                            packetService.publishConnect(socket);
                        }
                        socket.emit('pushId', reply);
                        var lastPacketIds = data.lastPacketIds;
                        if (lastPacketIds) {
                            for (var topic in lastPacketIds) {
                                ttlService.getPackets(topic, lastPacketIds[topic], socket);
                            }
                        }
                        ttlService.onPushId(socket, data.lastUnicastId);
                    });
                });
            }
        });

        socket.on('subscribeTopic', function (data) {
            var topic = data.topic;
            ttlService.getPackets(topic, data.lastPacketId, socket);
            socket.join(topic);
        });

        socket.on('unsubscribeTopic', function (data) {
            logger.debug("on unsubscribeTopic %j", data);
            var topic = data.topic;
            socket.leave(topic);
        });

        var token = function (data) {
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
            notificationService.setThirdPartyToken(data);
        };
        socket.on('apnToken', token);
        socket.on('token', token);

        socket.on('packetProxy', function (data) {
            data.pushId = socket.pushId;
            if (socket.uid) {
                data.uid = socket.uid;
            }
            if (packetService) {
                packetService.publishPacket(data);
            }
        });

        socket.on('unbindUid', function () {
            if (socket.pushId) {
                uidStore.removePushId(socket.pushId, true);
            }
        });

        socket.on('notificationReply', function (data) {
            stats.onNotificationReply(data.timestamp);
        });

        stats.addSession(socket);
    });
}

ProxyServer.prototype.getTopicOnline = function (topic) {
    var online = this.io.nsps['/'].adapter.rooms[topic].length;
    logger.debug("on topic online %s %d", topic, online);
    return online;
}