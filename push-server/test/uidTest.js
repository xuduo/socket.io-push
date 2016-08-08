var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('push test', function () {

    before(function () {

        global.pushService = defSetting.getDefaultPushService();
        global.apiUrl = defSetting.getDefaultApiUrl();
        global.pushClient = defSetting.getDefaultPushClient();
        global.apiService = pushService.api;

    });

    after(function () {
        global.pushService.close();
        global.pushClient.disconnect();
    });

    it('connect', function (done) {
        pushClient.on('connect', function (data) {
            expect(data.uid).to.be.undefined;
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
            pushClient.disconnect();
            pushClient.connect();
            pushClient.on('connect', function (data) {
                expect(data.uid).to.equal("1");
                request({
                    url: apiUrl + '/api/uid/bind',
                    method: "post",
                    form: {
                        pushId: pushClient.pushId,
                        uid: 2
                    }
                }, (error, response, body) => {
                    expect(JSON.parse(body).code).to.be.equal("success");
                    pushClient.disconnect();
                    pushClient.connect();
                    pushClient.on('connect', function (data) {
                        expect(data.uid).to.equal("2");
                        apiService.uidStore.getPushIdByUid("1", function (pushIds) {
                            expect(pushIds).to.not.contain(pushClient.pushId);
                            apiService.uidStore.getPushIdByUid("2", function (pushIds) {
                                expect(pushIds).to.contain(pushClient.pushId);
                                done();
                            });
                        });
                    });
                });
            });
        });

    });

    it('unbind uid', function (done) {
        pushClient.unbindUid();
        pushClient.disconnect();

        request({
            url: apiUrl + '/api/uid/remove',
            method: "post",
            form: {
                pushId: pushClient.pushId
            }
        }, (error, response, body) => {
            pushClient.connect();
            pushClient.on('connect', function (data) {
                expect(data.uid).to.be.undefined;
                pushClient.connect();
                done();
            });
        });

    });

});
