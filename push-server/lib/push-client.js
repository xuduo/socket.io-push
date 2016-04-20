module.exports = exports = PushClient;
var randomstring = require("randomstring");
var EventEmitter = require('events').EventEmitter;

function PushClient(url, opt) {
    if (!(this instanceof PushClient)) return new PushClient(url, opt);
    opt.forceNew = true;
    var self = this;
    this.topics = {'noti': 1};
    this.socket = require('socket.io-client')(url, opt);
    this.pushId = randomstring.generate(24);
    this.event = new EventEmitter();

    this.socket.on('connect', function () {
        console.log('PushClient socket.io connect');
        self.sendPushIdAndTopic();
    }.bind(this));

    this.socket.on('disconnect', function () {
        console.log('PushClient disconnected');
        self.event.emit('disconnect', data);
    }.bind(this));

    this.socket.on('pushId', function (data) {
        console.log('PushClient pushId connected ' + data.id);
        self.event.emit('connect', data);
    });

    this.socket.on('push', pushHandler.bind(this));
    this.socket.on('p', pushHandler.bind(this));
    if (opt.useNotification) {
        this.socket.on('noti', notiHandler.bind(this));
    }
}

PushClient.prototype.sendPushIdAndTopic = function () {
    var topics = Object.keys(this.topics);
    this.socket.emit('pushId', {id: this.pushId, version: 1, platform: "browser", topics: topics});
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
    console.log("pushHandler topic " + topic + " jsonData" + JSON.stringify(jsonData));
    this.event.emit("push", topic, jsonData);
}


var notiHandler = function (data) {
    console.log("notiHandler data: " + JSON.stringify(data));
    this.event.emit("notification", data.id, data.browser);
}

PushClient.prototype.on = function (event, callback) {
    this.event.removeAllListeners(event);
    this.event.on(event, callback);
};

PushClient.prototype.subscribeTopic = function (topic) {
    this.topics[topic] = 1;
    this.socket.emit('subscribeTopic', {topic: topic});
};


PushClient.prototype.unsubscribeTopic = function (topic) {
    delete this.topics[topic];
    this.socket.emit("unsubscribeTopic", {topic: topic});
}



