var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('push test', function () {

    before(function () {
        global.proxyServer = defSetting.getDefaultProxyServer();
        global.apiServer = defSetting.getDefaultApiServer();
        global.apiUrl = defSetting.getDefaultApiUrl();
    });

    after(function () {
        global.proxyServer.close();
        global.apiServer.close();
    });

    it('test ttl to topic', function (done) {

        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                pushAll: "true",
                topic: 'message',
                json: JSON.stringify({message: 1}),
                timeToLive: 10000
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
            var pushClient = defSetting.getDefaultPushClient();
            pushClient.subscribeTopicAndReceiveTTL("message");
            pushClient.on('push', function (data) {
                expect(data.message).to.equal(2);
                var send = false;
                pushClient.on("disconnect", function () {
                    console.log("pushClient.on(disconnect");
                    if (!send) {
                        send = true;

                        request({
                            url: apiUrl + '/api/push',
                            method: "post",
                            form: {
                                pushAll: "true",
                                topic: 'message',
                                json: JSON.stringify({message: 3}),
                                timeToLive: 10000
                            }
                        }, (error, response, body) => {
                            expect(JSON.parse(body).code).to.be.equal("success");
                            pushClient.connect();
                            pushClient.on('push', function (data) {
                                expect(data.message).to.equal(3);
                                pushClient.disconnect();
                                done();
                            });
                        });
                    }
                });
                pushClient.disconnect();

            });
            setTimeout(function () { // send while online

                request({
                    url: apiUrl + '/api/push',
                    method: "post",
                    form: {
                        pushAll: "true",
                        topic: 'message',
                        json: JSON.stringify({message: 2}),
                        timeToLive: 10000
                    }
                }, (error, response, body) => {
                });
            }, 100);
        });
    });

});
