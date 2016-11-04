var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('push test', () => {

    before(() => {
        global.proxyServer = defSetting.getDefaultProxyServer();
        global.apiServer = defSetting.getDefaultApiServer();
        global.apiUrl = defSetting.getDefaultApiUrl();
        global.pushClient = defSetting.getDefaultPushClient();
    });

    after(() => {
        global.proxyServer.close();
        global.apiServer.close();
        global.pushClient.disconnect();
    });

    it('connect', (done) => {
        pushClient.on('connect', (data) => {
            expect(data.uid).to.be.undefined;
            done();
        });
    });

    it('bind uid', (done) => {

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
            pushClient.on('connect', (data) => {
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
                    pushClient.on('connect', (data) => {
                        expect(data.uid).to.equal("2");
                        apiServer.uidStore.getPushIdByUid("1", (pushIds) => {
                            expect(pushIds).to.not.contain(pushClient.pushId);
                            apiServer.uidStore.getPushIdByUid("2", (pushIds) => {
                                expect(pushIds).to.contain(pushClient.pushId);
                                done();
                            });
                        });
                    });
                });
            });
        });

    });

    it('unbind from client', (done) => {
        pushClient.unbindUid();
        pushClient.disconnect();
        pushClient.connect();
        pushClient.on('connect', (data) => {
            expect(data.uid).to.be.undefined;
            pushClient.connect();
            done();
        });
    });

    it('unbind uid by pushId', (done) => {
        request({
            url: apiUrl + '/api/uid/bind',
            method: "post",
            form: {
                pushId: pushClient.pushId,
                uid: 1
            }
        }, (error, response, body) => {
            request({
                url: apiUrl + '/api/uid/remove',
                method: "post",
                form: {
                    pushId: pushClient.pushId
                }
            }, (error, response, body) => {
                pushClient.disconnect();
                pushClient.connect();
                pushClient.on('connect', (data) => {
                    expect(data.uid).to.be.undefined;
                    pushClient.connect();
                    done();
                });
            });
        });
    });

    it('unbind uid by uid', (done) => {
        request({
            url: apiUrl + '/api/uid/bind',
            method: "post",
            form: {
                pushId: pushClient.pushId,
                uid: 1
            }
        }, (error, response, body) => {
            request({
                url: apiUrl + '/api/uid/remove',
                method: "post",
                form: {
                    uid: 1
                }
            }, (error, response, body) => {
                pushClient.disconnect();
                pushClient.connect();
                pushClient.on('connect', (data) => {
                    expect(data.uid).to.be.undefined;
                    pushClient.connect();
                    done();
                });
            });
        });
    });

    it('invalid param test', (done) => {
        request({
            url: apiUrl + '/api/uid/remove',
            method: 'post',
        }, (error, response, body) => {
            let ret = JSON.parse(body);
            expect(ret.code).to.be.equal('error');
            done();
        })
    });

});
