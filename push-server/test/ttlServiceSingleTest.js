var request = require('request');
var chai = require('chai');
var randomstring = require("randomstring");
var expect = chai.expect;
var logger = require('winston-proxy')('TTLServiceTest');
var defSetting = require('./defaultSetting');

describe('push test', function () {

    before(function () {
        global.proxyServer = defSetting.getDefaultProxyServer();
        global.apiServer = defSetting.getDefaultApiServer();
        global.apiUrl = defSetting.getDefaultApiUrl();
        global.pushClient = defSetting.getDefaultPushClient();
    });

    after(function () {
        global.proxyServer.close();
        global.apiServer.close();
    });

    it('test ttl to single', function (done) {
        pushClient.on('push', function (data) {
            logger.debug('receive first push');
            expect(data.message).to.equal(1);
            pushClient.disconnect();

            request({
                url: apiUrl + '/api/push',
                method: "post",
                form: {
                    pushId: pushClient.pushId,
                    topic: 'message',
                    json: JSON.stringify({message: 2}),
                    timeToLive: 10000
                }
            }, (error, response, body) => {
                expect(JSON.parse(body).code).to.be.equal("success");
                request({
                    url: apiUrl + '/api/push',
                    method: "post",
                    form: {
                        pushId: pushClient.pushId,
                        topic: 'message',
                        json: JSON.stringify({message: 3}),
                        timeToLive: 10000
                    }
                }, (error, response, body) => {
                    expect(JSON.parse(body).code).to.be.equal("success");
                    pushClient.connect();
                    var push = [2, 3, 4];
                    pushClient.on('push', function (data) {
                        logger.debug("receive ", data.message);
                        expect(data.message).to.equal(push.shift());
                        if (push.length == 1) {
                            request({
                                    url: apiUrl + '/api/push',
                                    method: "post",
                                    form: {
                                        pushId: pushClient.pushId,
                                        topic: 'message',
                                        json: JSON.stringify({message: 4}),
                                        timeToLive: 10000
                                    }
                                }, (error, response, body) => {
                                }
                            );
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

        pushClient.on('connect', () => {
            pushClient.on('connect');
            request({
                url: apiUrl + '/api/push',
                method: "post",
                form: {
                    pushId: pushClient.pushId,
                    topic: 'message',
                    json: JSON.stringify({message: 1}),
                    timeToLive: 10000
                }
            }, (error, response, body) => {
                expect(JSON.parse(body).code).to.be.equal("success");
            });

        });

    });

});
