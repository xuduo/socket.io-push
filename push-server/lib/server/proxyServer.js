module.exports = (io, stats, packetService, notificationService, uidStore, ttlService, httpProxyService, tagService) => {
    return new ProxyServer(io, stats, packetService, notificationService, uidStore, ttlService, httpProxyService, tagService);
};
const logger = require('winston-proxy')('ProxyServer');
const http = require('http');

class ProxyServer {

    constructor(io, stats, packetService, notificationService, uidStore, ttlService, httpProxyService, tagService) {
        this.io = io;

        io.on('connection', (socket) => {

            socket.on('disconnect', () => {
                stats.removeSession();
                stats.removePlatformSession(socket.platform);
                if (socket.pushId) {
                    logger.debug("publishDisconnect %s", socket.pushId);
                    if (packetService) {
                        packetService.publishDisconnect(socket, (reallyDisconnect) => {
                            if(reallyDisconnect && socket.platform == "android"){
                                stats.userLogout(socket.pushId, Date.now());
                            }
                        });
                    }
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

                    const topics = data.topics;
                    if (topics && topics.length > 0) {
                        topics.forEach((topic) => {
                            socket.join(topic);
                        });
                    }

                    if (data.platform) {
                        socket.platform = data.platform.toLowerCase();
                        if (socket.platform == 'android' && topics && -1 != topics.indexOf("noti")) {
                            stats.userLogin(data.id, Date.now());
                        }
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
                                socket.pushId = data.id;
                                if (packetService) {
                                    packetService.publishConnect(socket);
                                }
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
                const topic = data.topic;
                ttlService.getPackets(topic, data.lastPacketId, socket);
                socket.join(topic);
            });

            socket.on('unsubscribeTopic', (data) => {
                logger.debug("on unsubscribeTopic %j", data);
                const topic = data.topic;
                socket.leave(topic);
            });

            socket.on('http', (data, callback) => {
                httpProxyService.request(data, (result) => {
                    callback(result);
                });
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
                notificationService.setToken(data);
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

            socket.on('notificationReply', (data) => {
                stats.onNotificationReply(data.timestamp);
                stats.addReachSuccess(data.id, 1);
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
