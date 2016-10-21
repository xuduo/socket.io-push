module.exports = (redis) => {
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
        const data = {pushId: socket.pushId, path: "/socketDisconnect"};
        if (socket.uid) {
            data.uid = socket.uid;
        }
        this.publishPacket(data);
    }

    publishConnect(socket) {
        const data = {pushId: socket.pushId, path: "/socketConnect"};
        if (socket.uid) {
            data.uid = socket.uid;
        }
        this.publishPacket(data);
    }

}
