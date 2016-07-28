var request = require('superagent');

var chai = require('chai');

var expect = chai.expect;

describe('push test', function () {

    before(function () {

        global.pushService = require('../lib/push-server.js')({
            proxy: require("../config-proxy"),
            api: require("../config-api")
        });
        global.apiUrl = 'http://localhost:' + pushService.api.port;
        global.pushClient = require('socket.io-push-client')('http://localhost:' + pushService.proxy.port, {
            transports: ['websocket', 'polling'],
            useNotification: true
        });
        global.pushClient2 = require('socket.io-push-client')('http://localhost:' + pushService.proxy.port, {
            transports: ['websocket', 'polling'],
            useNotification: true
        });
    });

    after(function () {
        global.pushService.close();
    });

    it('connect', function (done) {
        var connected = 0;
        pushClient.on('connect', function (data) {
            expect(data.pushId).to.be.equal(pushClient.pushId);
            if (++connected == 2) {
                done();
            }
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
        var json = '{ "message":"ok"}';
        var messageCallback = function (data) {
            expect(data.message).to.be.equal('ok');
            if (++rec == 2) {
                done();
            }
        };

        pushClient.on('push', messageCallback);

        pushClient2.on('push', function (data) {
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
                json: json
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });

        request
            .post(apiUrl + '/api/push')
            .send({
                pushAll: true,
                json: json
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

    it('Push raw String', function (done) {
        var json = 'test string';
        var messageCallback = function (data) {
            expect(data).to.be.equal(json);
            done();
        };

        pushClient.on('push', messageCallback);

        request
            .post(apiUrl + '/api/push')
            .send({
                pushId: pushClient.pushId,
                topic: 'message',
                json: json
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });

    });

    it('Push json array', function (done) {
        var json = '[0,1,2]';
        var messageCallback = function (data) {
            expect(data[1]).to.be.equal(1);
            done();
        };

        pushClient.on('push', messageCallback);

        request
            .post(apiUrl + '/api/push')
            .send({
                pushId: pushClient.pushId,
                topic: 'message',
                json: json
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });

    });

    it('Push to multi pushId', function (done) {
        var rec = 0;
        var json = '{ "message":"ok"}';

        var messageCallback = function (data) {
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
                json: json
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });

        request
            .post(apiUrl + '/api/push')
            .send({
                pushId: ["abc", pushClient.pushId, pushClient2.pushId],
                json: json
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
    });

    it('bind uid', function (done) {

        request
            .post(apiUrl + '/api/uid/bind')
            .send({
                pushId: pushClient.pushId,
                uid: 1
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
                request
                    .post(apiUrl + '/api/uid/bind')
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
        var json = '{ "message":"ok"}';
        var messageCallback = function (data) {
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
                json: json
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });

        request
            .post(apiUrl + '/api/push')
            .send({
                uid: [0, 1, 2, 3],
                json: json
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
        request
            .post(apiUrl + '/api/push')
            .send({
                uid: 5,
                json: json
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
        request
            .post(apiUrl + '/api/push')
            .send({
                uid: "5",
                json: json
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
        request
            .post(apiUrl + '/api/push')
            .send({
                uid: 1,
                json: json
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
        request
            .post(apiUrl + '/api/push')
            .send({
                uid: "2",
                json: json
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
    });


    it('push to topic', function (done) {
        var json = '{ "message":"ok"}';

        var messageCallback = function (data) {
            expect(data.message).to.be.equal('ok');
            pushClient.disconnect();
            done();
        }
        pushClient.subscribeTopic("message");
        pushClient.on('push', messageCallback);
        request
            .post(apiUrl + '/api/push')
            .send({
                pushAll: "true",
                topic: 'message',
                json: json
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
    });

});
