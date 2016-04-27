var request = require('superagent');
var config = require('../config.js');
var oldApiPort = config.api_port;
config.api_port = 0;
var pushService = require('../lib/push-server.js')(config);

config.io_port = config.io_port + 1;
config.api_port = oldApiPort;
var apiService = require('../lib/push-server.js')(config);
var apiUrl = 'http://localhost:' + config.api_port;

var chai = require('chai');
var randomstring = require("randomstring");
var expect = chai.expect;

describe('push test', function () {

    it('test ttl to single', function (done) {
        var pushId = randomstring.generate(24);
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
                        var pushClient = require('../lib/push-client.js')('http://localhost:' + config.io_port, {
                            transports: ['websocket', 'polling'],
                            useNotification: true,
                            pushId: pushId
                        });
                        var push = [1, 2, 3];
                        pushClient.on('push', function (topic, data) {
                            expect(topic).to.equal("message");
                            expect(data.message).to.equal(push.shift());
                            if (push.length == 1) {
                                request
                                    .post(apiUrl + '/api/push')
                                    .send({
                                        pushId: pushId,
                                        topic: 'message',
                                        json: JSON.stringify({message: 3}),
                                        timeToLive: 10000
                                    })
                                    .set('Accept', 'application/json').end();
                            }
                            if (push.length == 0) {
                                pushClient.disconnect();
                                pushClient.on('push', function () {
                                    expect('do not recieve after reconnect').to.equal('');
                                });
                                pushClient.connect();
                                pushClient.on('connect', function () {
                                    setTimeout(function () {
                                        done();
                                    }, 200);
                                })
                            }
                        });

                    });
            });


    });


});
