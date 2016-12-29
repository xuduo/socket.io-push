module.exports = (io, stats, packetService, tokenService, uidStore, ttlService, tagService, connectService, arrivalStats, config) => {
    return new ProxyServer(io, stats, packetService, tokenService, uidStore, ttlService, tagService, connectService, arrivalStats, config);
};
const logger = require('winston-proxy')('ProxyServer');
const http = require('http');

class ProxyServer {

    constructor(io, stats, packetService, tokenService, uidStore, ttlService, tagService, connectService, arrivalStats, config) {
        this.io = io;

        io.on('connection', (socket) => {
            socket.on('disconnect', (reason) => {
                logger.debug("disconnect by transport, pushId: %s, socketId:%s, reason: %s", socket.pushId, socket.id, reason);
                stats.removeSession();
                stats.removePlatformSession(socket.platform);
                let disconnect_delay = 0;
                if (reason != 'ping timeout') disconnect_delay = config.disconnect_delay || 0;
                if (socket.pushId) {
                    setTimeout(() => {
                        connectService.disconnect(socket, (ret) => {
                            if (ret) {
                                if (packetService) {
                                    logger.debug("publishDisconnect pushId:%s, socketId:%s", socket.pushId, socket.id);
                                    packetService.publishDisconnect(socket);
                                }
                            }
                        })
                    }, disconnect_delay);
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

            socket.on('pushId', (data) => {
                if (data.id && data.id.length >= 10) {
                    logger.debug("on pushId %j socketId", data, socket.id);
                    socket.pushId = data.id;
                    const topics = data.topics;
                    if (topics && topics.length > 0) {
                        topics.forEach((topic) => {
                            socket.join(topic);
                        });
                        socket.topics = topics;
                    }
                    if (data.platform) {
                        socket.platform = data.platform.toLowerCase();
                    }
                    stats.addPlatformSession(socket.platform);

                    socket.join(data.id, (err) => {
                        if (err) {
                            logger.error("join pushId room fail %s", err);
                            return;
                        }
                        tagService.getTagsByPushId(data.id, (tags) => {
                            uidStore.getUidByPushId(data.id, (uid) => {
                                const reply = {id: data.id};
                                if (tags) {
                                    reply.tags = tags;
                                }
                                if (uid) {
                                    reply.uid = uid;
                                    socket.uid = uid;
                                }
                                connectService.connect(socket, (ret) => {
                                    if (ret) {
                                        if (packetService) {
                                            packetService.publishConnect(socket);
                                        }
                                    }
                                });
                                socket.emit('pushId', reply);
                                const lastPacketIds = data.lastPacketIds;
                                if (lastPacketIds) {
                                    for (const topic in lastPacketIds) {
                                        ttlService.getPackets(topic, lastPacketIds[topic], socket);
                                    }
                                }
                                ttlService.onPushId(socket, data.lastUnicastId);
                            });
                        });
                    });
                }
            });

            socket.on('addTag', (data) => {
                if (socket.pushId && data.tag) {
                    tagService.addTag(socket.pushId, data.tag);
                }
            });

            socket.on('removeTag', (data) => {
                if (socket.pushId && data.tag) {
                    tagService.removeTag(socket.pushId, data.tag);
                }
            });

            socket.on('subscribeTopic', (data) => {
                logger.debug("on subscribeTopic %j, pushId %s", data, socket.pushId);
                const topic = data.topic;
                ttlService.getPackets(topic, data.lastPacketId, socket);
                socket.join(topic);
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
                tokenService.setToken(data);
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
                if (socket.pushId) {
                    uidStore.removePushId(socket.pushId, true);
                }
            });

            if (config.bindUid) {
                config.request = require('request');
                socket.on('bindUid', (data) => {
                    logger.debug("bindUid %s %j", socket.pushId, data);
                    if (socket.pushId && data) {
                        config.bindUid(data, (uid)=> {
                            if (uid) {
                                socket.uid = uid;
                                uidStore.bindUid(socket.pushId, data.uid, socket.platform);
                            }
                        });
                    }
                });
            }

            socket.on('notificationReply', (data) => {
                stats.onNotificationReply(data.timestamp);
                arrivalStats.addPacketRecv(data.id, 1);
            });

            stats.addSession(socket);
        });
    }

    getTopicOnline(topic) {
        const online = this.io.nsps['/'].adapter.rooms[topic].length;
        logger.debug("on topic online %s %d", topic, online);
        return online;
    }

}
