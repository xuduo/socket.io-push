module.exports = (redis) => {
    return new ConnectService(redis);
};

const logger = require('winston-proxy')('ConnectService');

class ConnectService {
    constructor(redis) {
        this.redis = redis;
    }

    isConnected(pushId, callback) {
        this.redis.get("pushIdSocketId#" + pushId, (err, socketId) => {
            if (socketId) {
                callback(true, socketId);
            } else {
                callback(false);
            }
        })
    }

    bindPushId(pushId, socketId, callback) {
        const key = "pushIdSocketId#" + pushId;
        this.redis.set(key, socketId);
        this.redis.expire(key, 30 * 24 * 3600);
        if (callback) {
            callback();
        }
    }

    unbindPushId(pushId, callback) {
        this.redis.del("pushIdSocketId#" + pushId);
        if (callback) {
            callback();
        }
    }

    disconnect(socket, callback) {
        this.isConnected(socket.pushId, (connectedOrNot, socketId) => {
            if(connectedOrNot && socketId == socket.id){
                this.unbindPushId(socket.pushId);
                callback(true);
            }else{
                callback(false);
            }
        })
    }

    connect(socket, callback){
        this.isConnected(socket.pushId, (connectedOrNot, socketId) => {
            if(connectedOrNot){
                callback(false);
            }else{
                this.bindPushId(socket.pushId, socket.id);
                callback(true);
            }
        })
    }
}
