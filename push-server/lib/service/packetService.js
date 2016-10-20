module.exports = (redis, connectService) => {
    return new PacketService(redis, connectService);
};
const logger = require('winston-proxy')('PacketService');
const randomstring = require("randomstring");

class PacketService {

    constructor(redis,connectService) {
        this.redis = redis;
        this.connectService = connectService;
    }

    publishPacket(data) {
        const path = data.path;
        const pushId = data.pushId;
        if (path && pushId) {
            if (!data.sequenceId) {
                data.sequenceId = randomstring.generate(16);
            }
            data.timestamp = Date.now();
            const strData = JSON.stringify(data);
            this.redis.publish("event#client", strData);
        }
    }

    publishDisconnect(socket) {
        this.connectService.isConnected(socket.pushId, (connectedOrNot, socketId) => {
            if (connectedOrNot && socketId == socket.id) {
                logger.debug("publishDisconnect socketId: %s, pushId: %s", socket.id, socket.pushId);
                this.connectService.unbindPushId(socket.pushId, () => {
                    const data = {pushId: socket.pushId, path: "/socketDisconnect"}
                    if (socket.uid) {
                        data.uid = socket.uid;
                    }
                    this.publishPacket(data);
                })
            }
        });
    }

    publishConnect(socket) {
        this.connectService.isConnected(socket.pushId, (connectedOrNot, socketId) => {
            if (connectedOrNot) {
                logger.debug("reconnect do not publish", socketId);
            } else {
                logger.debug("first connect publish, pushId:%s, socketId:%s", socket.pushId, socket.id);
                this.connectService.bindPushId(socket.pushId, socket.id, () => {
                    const data = {pushId: socket.pushId, path: "/socketConnect"};
                    if (socket.uid) {
                        data.uid = socket.uid;
                    }
                    this.publishPacket(data);
                })
            }
        })
    }

}
