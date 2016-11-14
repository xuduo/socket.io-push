var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('notification', function () {

    before(function () {
        global.proxyServer = defSetting.getDefaultProxyServer();
        global.apiServer = defSetting.getDefaultApiServer();
        global.apiUrl = defSetting.getDefaultApiUrl();
        global.pushClient = defSetting.getDefaultPushClient();
        global.pushClient2 = defSetting.getDefaultPushClient();
    });

    after(function () {
        global.proxyServer.close();
        global.apiServer.close();
        global.pushClient.disconnect();
        global.pushClient2.disconnect();
    });

    it('connect', function (done) {
        pushClient.on('connect', function (data) {
            expect(data.pushId).to.be.equal(pushClient.pushId);
            done();
        });

    });


    it('bind uid', function (done) {

        request({
            url: apiUrl + '/api/uid/bind',
            method: "post",
            form: {
                pushId: pushClient.pushId,
                uid: 1
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
            done();
        });
    });


    it('notification to pushId', function (done) {
        var title = 'hello',
            message = 'hello world';
        var data = {
            "android": {"title": title, "message": message}
        }
        var str = JSON.stringify(data);

        var notificationCallback = function (data) {
            expect(data.title).to.be.equal(title);
            expect(data.message).to.be.equal(message);
            done();
        }
        pushClient.on('notification', notificationCallback);


        request({
            url: apiUrl + '/api/notification',
            method: "post",
            form: {
                pushId: pushClient.pushId,
                notification: str
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
        });

    });

    it('Notification pushAll', function (done) {
        var title = 'hello',
            message = 'hello world';
        var data = {
            android: {"title": title, "message": message},
            payload: {"ppp": 123}
        }
        var str = JSON.stringify(data);

        var notificationCallback = function (data) {
            expect(data.title).to.be.equal(title);
            expect(data.message).to.be.equal(message);
            expect(data.payload.ppp).to.be.equal(123);
            done();
        }
        pushClient.on('notification', notificationCallback);


        request({
            url: apiUrl + '/api/notification',
            method: "post",
            form: {
                pushAll: 'true',
                notification: str,
                timeToLive: 100
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
        });
    });


});
