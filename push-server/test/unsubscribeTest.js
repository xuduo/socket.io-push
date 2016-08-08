var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('unsubscribe test', function () {

    before(function () {
        global.proxyServer = defSetting.getDefaultProxyServer();
        global.apiServer = defSetting.getDefaultApiServer();
        global.apiUrl = defSetting.getDefaultApiUrl();
        global.pushClient = defSetting.getDefaultPushClient();
    });

    after(function () {
        global.proxyServer.close();
        global.apiServer.close();
        global.pushClient.disconnect();
    });


    it('connect', function (done) {
        pushClient.on('connect', function (data) {
            expect(data.pushId).to.be.equal(pushClient.pushId);
            done();
        });

    });


    it('push to topic', function (done) {
        var json = '{ "message":"ok"}';

        var i = 0;
        pushClient.subscribeTopic("message");
        pushClient.on('push', function (data) {
            expect(i++ == 0);
            expect(data.message).to.be.equal('ok');
            pushClient.unsubscribeTopic("message");

            request({
                url: apiUrl + '/api/push',
                method: "post",
                form: {
                    topic: 'message',
                    json: json
                }
            }, (error, response, body) => {
                expect(JSON.parse(body).code).to.be.equal("success");
                setTimeout(function () {
                    done();
                }, 100);
            });

        });

        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                topic: 'message',
                json: json
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
        });

    });

});
