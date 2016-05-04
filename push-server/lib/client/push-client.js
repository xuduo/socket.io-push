module.exports = exports = PushClient;
var randomstring = require("randomstring");
var EventEmitter = require('events').EventEmitter;
var clientId = 0;
var receiveTTL = 2;
var doNotReceiveTTL = 1;
var notiTopic = 'bnoti';

function PushClient(url, opt) {
    if (!(this instanceof PushClient)) return new PushClient(url, opt);
    opt.forceNew = true;
    if (!opt.transports) {
        opt.transports = ['websocket'];
    }
    clientId++;
    var self = this;
    this.topics = {};
    this.socket = require('socket.io-client')(url, opt);
    this.initStorage();
    if (opt.pushId) {
        this.pushId = opt.pushId;
    } else {
        this.pushId = this.getItem("pushId");
        if (!this.pushId) {
            this.pushId = randomstring.generate(24);
        }
    }
    this.setItem("pushId", this.pushId);

    this.event = new EventEmitter();
    this.socket.on('connect', function () {
        console.log('PushClient socket.io connect');
        self.sendPushIdAndTopic();
    }.bind(this));

    this.socket.on('disconnect', function () {
        console.log('PushClient disconnected');
        self.event.emit('disconnect');
    }.bind(this));

    this.socket.on('pushId', function (data) {
        console.log('PushClient pushId connected ' + data.id);
        self.event.emit('connect', {pushId: data.id, uid: data.uid});
    });

    this.topicToLastPacketId = {};

    this.socket.on('push', pushHandler.bind(this));
    this.socket.on('p', pushHandler.bind(this));
    if (opt.useNotification) {
        this.topics[notiTopic] = receiveTTL;
        this.socket.on(notiTopic, notiHandler.bind(this));
    }
}

// private
PushClient.prototype.getItem = function (key) {
    return localStorage.getItem("PushClient:" + clientId + ":" + key);
}

// private
PushClient.prototype.setItem = function (key, val) {
    localStorage.setItem("PushClient:" + clientId + ":" + key, val);
}

// private
PushClient.prototype.initStorage = function () {
    if (typeof localStorage === "undefined" || localStorage === null) {
        localStorage = require('./localStorage')();
    }
}

// private
PushClient.prototype.sendPushIdAndTopic = function () {
    var topics = Object.keys(this.topics);
    console.log("lastUni %j", this.topicToLastPacketId);
    this.socket.emit('pushId', {
        id: this.pushId,
        version: 1,
        platform: "browser",
        topics: topics,
        lastUnicastId: this.getItem("lastUnicastId"),
        lastPacketIds: this.topicToLastPacketId
    });
}

PushClient.prototype.updateLastPacketId = function (topic, data) {
    var id = data.id || data.i;
    var ttl = data.ttl || data.t;
    var unicast = data.unicast || data.u;
    console.log("updateLastPacketId %j", data, topic, id, ttl, unicast);
    if (id && ttl) {
        if (unicast) {
            this.setItem("lastUnicastId", id);
        } else if (topic != null && this.topics[topic] == 2) {
            this.topicToLastPacketId[topic] = id;
        }
    }
}

PushClient.prototype.unbindUid = function () {
    this.socket.emit('unbindUid');
}

PushClient.prototype.disconnect = function () {
    this.socket.disconnect();
}

PushClient.prototype.connect = function () {
    this.socket.connect();
}


var pushHandler = function (data) {
    var jsonData;
    var dataBase64 = data.data || data.d;
    if (dataBase64) {
        jsonData = JSON.parse(new Buffer(dataBase64, 'base64').toString());
    } else {
        jsonData = data.j;
    }
    var topic = data.topic || data.t || '';
    this.updateLastPacketId(topic, data);
    console.log("pushHandler topic " + topic + " jsonData" + JSON.stringify(jsonData));
    this.event.emit("push", topic, jsonData);
}

var notiHandler = function (data) {
    console.log("notiHandler data: " + JSON.stringify(data));
    this.updateLastPacketId(notiTopic, data);
    this.event.emit("notification", data);
}

PushClient.prototype.on = function (event, callback) {
    this.event.removeAllListeners(event);
    this.event.on(event, callback);
};

PushClient.prototype.subscribeTopic = function (topic) {
    this.topics[topic] = doNotReceiveTTL;
    this.socket.emit('subscribeTopic', {topic: topic});
};

PushClient.prototype.subscribeTopicAndReceiveTTL = function (topic) {
    this.topics[topic] = receiveTTL;
    this.socket.emit('subscribeTopic', {topic: topic});
};

PushClient.prototype.unsubscribeTopic = function (topic) {
    delete this.topics[topic];
    this.socket.emit("unsubscribeTopic", {topic: topic});
}