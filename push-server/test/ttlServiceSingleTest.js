var request = require('superagent');

var chai = require('chai');
var randomstring = require("randomstring");
var expect = chai.expect;
var logger = require('winston-proxy')('TTLServiceTest');

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
    });

    after(function () {
        global.pushService.close();
    });

    it('test ttl to single', function (done) {
        pushClient.on('push', function (data) {
            logger.debug('receive first push');
            expect(data.message).to.equal(1);
            pushClient.disconnect();
            request
                .post(apiUrl + '/api/push')
                .send({
                    pushId: pushId,
                    topic: 'message',
                    json: JSON.stringify({message: 2}),
                    timeToLive: 10000
                })
                .set('Accept', 'application/json')
                .end(function (err, res) {
                    expect(res.text).to.be.equal('{"code":"success"}');
                    request
                        .post(apiUrl + '/api/push')
                        .send({
                            pushId: pushId,
                            topic: 'message',
                            json: JSON.stringify({message: 3}),
                            timeToLive: 10000
                        })
                        .set('Accept', 'application/json')
                        .end(function (err, res) {
                            expect(res.text).to.be.equal('{"code":"success"}');
                            pushClient.connect();
                            var push = [2, 3, 4];
                            pushClient.on('push', function (data) {
                                logger.debug("receive ", data.message);
                                expect(data.message).to.equal(push.shift());
                                if (push.length == 1) {
                                    request
                                        .post(apiUrl + '/api/push')
                                        .send({
                                            pushId: pushId,
                                            topic: 'message',
                                            json: JSON.stringify({message: 4}),
                                            timeToLive: 10000
                                        })
                                        .set('Accept', 'application/json').end(function () {

                                    });
                                }
                                if (push.length == 0) {
                                    pushClient.disconnect();
                                    pushClient.on('push', function (data) {
                                        expect('do not recieve after reconnect').to.equal(data.message);
                                    });
                                    pushClient.connect();
                                    pushClient.on('connect', function () {
                                        setTimeout(function () {
                                            pushClient.disconnect();
                                            done();
                                        }, 200);
                                    })
                                }
                            });
                        });
                });
        });
        var pushId = pushClient.pushId;
        pushClient.on('connect', function () {
            pushClient.on('connect');
            request
                .post(apiUrl + '/api/push')
                .send({
                    pushId: pushId,
                    topic: 'message',
                    json: JSON.stringify({message: 1}),
                    timeToLive: 10000
                })
                .set('Accept', 'application/json')
                .end(function (err, res) {
                    expect(res.text).to.be.equal('{"code":"success"}');
                    logger.debug('call api success');

                });
        });

    });

});
