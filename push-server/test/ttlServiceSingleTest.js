var request = require('superagent');
var config = require('../config.js');

var apiUrl = 'http://localhost:' + config.api_port;

var chai = require('chai');
var randomstring = require("randomstring");
var expect = chai.expect;
var logger = require('../lib/log/index.js')('TTLServiceTest');

describe('push test', function () {

    before(function () {
        global.pushServer = require('../lib/push-server.js')(config);
    });

    after(function () {
        global.pushServer.close();
    });

    it('test ttl to single', function (done) {
        var pushClient = require('../lib/client/push-client.js')('http://localhost:' + config.io_port);
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
