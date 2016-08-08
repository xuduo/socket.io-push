var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('push test', function () {

    before(function () {
        global.pushService = defSetting.getDefaultPushService();
        global.apiUrl = defSetting.getDefaultApiUrl();
        global.pushClient = defSetting.getDefaultPushClient();
        global.pushClient2 = defSetting.getDefaultPushClient();
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

        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                pushId: pushClient.pushId,
                topic: 'message',
                json: json
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
        });


        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                pushAll: true,
                json: json
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("error");
        });


        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                pushId: pushClient2.pushId,
                json: '{ "message":"ok"}'
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
        });
    });

    it('Push raw String', function (done) {
        var json = 'test string';
        var messageCallback = function (data) {
            expect(data).to.be.equal(json);
            done();
        };

        pushClient.on('push', messageCallback);


        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                pushId: pushClient.pushId,
                topic: 'message',
                json: json
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
        });

    });

    it('Push json array', function (done) {
        var json = '[0,1,2]';
        var messageCallback = function (data) {
            expect(data[1]).to.be.equal(1);
            done();
        };

        pushClient.on('push', messageCallback);

        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                pushId: pushClient.pushId,
                topic: 'message',
                json: json
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
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

        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                pushId: JSON.stringify(["abc", pushClient.pushId, pushClient2.pushId]),
                json: json
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
        });

        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                pushId: ["abc", pushClient.pushId, pushClient2.pushId],
                json: json
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
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
            request({
                url: apiUrl + '/api/uid/bind',
                method: "post",
                form: {
                    pushId: pushClient2.pushId,
                    uid: 2
                }
            }, (error, response, body) => {
                expect(JSON.parse(body).code).to.be.equal("success");
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

        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                uid: JSON.stringify([0, 1, 2, 3]),
                json: json
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
        });


        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                uid: [0, 1, 2, 3],
                json: json
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
        });


        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                uid: 5,
                json: json
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
        });


        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                uid: "5",
                json: json
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
        });


        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                uid: 1,
                json: json
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
        });


        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                uid: "2",
                json: json
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
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

        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                pushAll: "true",
                topic: 'message',
                json: json
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
        });
    });

});
