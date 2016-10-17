module.exports = function (redis) {
    return new PacketService(redis);
};
const logger = require('winston-proxy')('PacketService');
const randomstring = require("randomstring");

class PacketService {

    constructor(redis) {
        this.redis = redis;
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
        const self = this;
        this.redis.get("pushIdSocketId#" + socket.pushId, function (err, lastSocketId) {
            // reply is null when the key is missing
            logger.debug("pushIdSocketId redis %s %s %s", socket.id, lastSocketId, socket.pushId);
            if (lastSocketId == socket.id) {
                logger.debug("publishDisconnect current socket disconnect %s", socket.id);
                self.redis.del("pushIdSocketId#" + socket.pushId);
                const data = {pushId: socket.pushId, path: "/socketDisconnect"};
                if (socket.uid) {
                    data.uid = socket.uid;
                }
                self.publishPacket(data);
            }
        });
    }

    publishConnect(socket) {
        const self = this;
        this.redis.get("pushIdSocketId#" + socket.pushId, function (err, lastSocketId) {
            // reply is null when the key is missing
            if (lastSocketId) {
                logger.debug("reconnect do not publish", lastSocketId);
            } else {
                logger.debug("first connect publish", lastSocketId);
                const data = {pushId: socket.pushId, path: "/socketConnect"};
                if (socket.uid) {
                    data.uid = socket.uid;
                }
                self.publishPacket(data);
            }
            self.redis.set("pushIdSocketId#" + socket.pushId, socket.id);
            self.redis.expire("pushIdSocketId#" + socket.pushId, 3600 * 24 * 7);
        });
    }

}
