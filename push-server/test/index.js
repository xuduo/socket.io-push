var request = require('superagent');
var config = require('../config.js');
var oldApiPort = config.api_port;
config.api_port = 0;
var pushService = require('../lib/push-server.js')(config);
var pushClient = require('../lib/push-client.js')('http://localhost:' + config.io_port, {
    transports: ['websocket', 'polling'],
    useNotification: true
});
config.io_port = config.io_port + 1;
config.api_port = oldApiPort;
var apiService = require('../lib/push-server.js')(config);
var apiUrl = 'http://localhost:' + config.api_port;


var chai = require('chai');

var expect = chai.expect;

describe('push test', function () {

    it('Socket Io connect', function (done) {
        pushClient.on('connect', function (data) {
            expect(data.id).to.be.equal(pushClient.pushId);
            done();
        });
    });

    it('Push to id', function (done) {
        var b = new Buffer('{ "message":"ok"}');
        var data = b.toString('base64');

        var messageCallback = function (topic, data) {
            expect(topic).to.be.equal('message');
            expect(data.message).to.be.equal('ok');
            done();
        }

        pushClient.on('push', messageCallback);
        request
            .post(apiUrl + '/api/push')
            .send({
                pushId: pushClient.pushId,
                topic: 'message',
                data: data
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
    });

    it('push to topic', function (done) {
        var b = new Buffer('{ "message":"ok"}');
        var data = b.toString('base64');

        var messageCallback = function (topic, data) {
            expect(topic).to.be.equal('message');
            expect(data.message).to.be.equal('ok');
            done();
        }
        pushClient.subscribeTopic("message");
        pushClient.on('push', messageCallback);
        request
            .post(apiUrl + '/api/push')
            .send({
                pushAll: "true",
                topic: 'message',
                data: data
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
    });

    it('Socket IO Notification', function (done) {
        var title = 'hello',
            message = 'hello world';
        var data = {
            "browser": {"title": title, "message": message},
            "apn": {"alert": message, "badge": 5, "sound": "default", "payload": {}}
        }
        var str = JSON.stringify(data);

        var notificationCallback = function (id,data) {
            expect(data.title).to.be.equal(title);
            expect(data.message).to.be.equal(message);
            done();
        }
        pushClient.on('notification', notificationCallback);


        request
            .post(apiUrl + '/api/notification')
            .send({
                pushId: '',
                pushAll: 'true',
                notification: str
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
    });


});
