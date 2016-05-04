var request = require('superagent');
var config = require('../config.js');
var oldApiPort = config.api_port;
config.api_port = 0;
var pushService = require('../lib/push-server.js')(config);
var pushClient;
var pushClient2;
config.io_port = config.io_port + 1;
config.api_port = oldApiPort;
var apiService = require('../lib/push-server.js')(config);
var apiUrl = 'http://localhost:' + config.api_port;

var chai = require('chai');

var expect = chai.expect;

describe('push test', function () {

    it('connect', function (done) {
        var connected = 0;
        pushClient =  require('../lib/client/push-client.js')('http://localhost:' + config.io_port, {
            transports: ['websocket', 'polling'],
            useNotification: true
        });
        pushClient.on('connect', function (data) {
            expect(data.pushId).to.be.equal(pushClient.pushId);
            if (++connected == 2) {
                done();
            }
        });

        pushClient2 = require('../lib/client/push-client.js')('http://localhost:' + config.io_port, {
            transports: ['websocket', 'polling'],
            useNotification: true
        });

        pushClient2.on('connect', function (data) {
            expect(data.pushId).to.be.equal(pushClient2.pushId);
            if (++connected == 2) {
                done();
            }
        });
    });

    it('Push to single pushId', function (done) {
        var rec = 0;
        var b = new Buffer('{ "message":"ok"}');
        var data = b.toString('base64');

        var messageCallback = function (topic, data) {
            expect(topic).to.be.equal('message');
            expect(data.message).to.be.equal('ok');
            if (++rec == 2) {
                done();
            }
        };

        pushClient.on('push', messageCallback);

        pushClient2.on('push',function(topic, data){
            expect(topic).to.be.equal('');
            expect(data.message).to.be.equal('ok');
            if (++rec == 2) {
                done();
            }
        });
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

        request
            .post(apiUrl + '/api/push')
            .send({
                pushAll: true,
                data: data
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(JSON.parse(res.text).code).to.be.equal("error");
            });

        request
            .post(apiUrl + '/api/push')
            .send({
                pushId: pushClient2.pushId,
                json: '{ "message":"ok"}'
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
    });

    it('Push to multi pushId', function (done) {
        var rec = 0;
        var b = new Buffer('{ "message":"ok"}');
        var data = b.toString('base64');

        var messageCallback = function (topic, data) {
            expect(topic).to.be.equal('message');
            expect(data.message).to.be.equal('ok');
            if (++rec == 4) {
                done();
            }
        }

        pushClient.on('push', messageCallback);
        pushClient2.on('push', messageCallback);
        request
            .post(apiUrl + '/api/push')
            .send({
                pushId: JSON.stringify(["abc", pushClient.pushId, pushClient2.pushId]),
                topic: 'message',
                data: data
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });

        request
            .post(apiUrl + '/api/push')
            .send({
                pushId: ["abc", pushClient.pushId, pushClient2.pushId],
                topic: 'message',
                data: data
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
    });

    it('bind uid', function (done) {

        request
            .post(apiUrl + '/api/addPushIdToUid')
            .send({
                pushId: pushClient.pushId,
                uid: 1
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
                request
                    .post(apiUrl + '/api/addPushIdToUid')
                    .send({
                        pushId: pushClient2.pushId,
                        uid: 2
                    })
                    .set('Accept', 'application/json')
                    .end(function (err, res) {
                        expect(res.text).to.be.equal('{"code":"success"}');
                        done();
                    });
            });
    });

    it('Push to uid', function (done) {
        var rec = 0;
        var b = new Buffer('{ "message":"ok"}');
        var data = b.toString('base64');

        var messageCallback = function (topic, data) {
            expect(topic).to.be.equal('message');
            expect(data.message).to.be.equal('ok');
            if (++rec == 6) {
                done();
            }
        }

        pushClient.on('push', messageCallback);
        pushClient2.on('push', messageCallback);
        request
            .post(apiUrl + '/api/push')
            .send({
                uid: JSON.stringify([0, 1, 2, 3]),
                topic: 'message',
                data: data
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });

        request
            .post(apiUrl + '/api/push')
            .send({
                uid: [0, 1, 2, 3],
                topic: 'message',
                data: data
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
        request
            .post(apiUrl + '/api/push')
            .send({
                uid: 5,
                topic: 'message',
                data: data
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
        request
            .post(apiUrl + '/api/push')
            .send({
                uid: "5",
                topic: 'message',
                data: data
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
        request
            .post(apiUrl + '/api/push')
            .send({
                uid: 1,
                topic: 'message',
                data: data
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
        request
            .post(apiUrl + '/api/push')
            .send({
                uid: "2",
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

    it('Notification pushAll', function (done) {
        var title = 'hello',
            message = 'hello world';
        var data = {
            "android": {"title": title, "message": message},
            "apn": {"alert": message, "badge": 5, "sound": "default", "payload": {}}
        }
        var str = JSON.stringify(data);

        var notificationCallback = function (data) {
            expect(data.browser.title).to.be.equal(title);
            expect(data.browser.message).to.be.equal(message);
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
