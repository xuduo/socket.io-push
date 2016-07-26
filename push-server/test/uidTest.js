var request = require('superagent');
var config = require('../config.js');

var chai = require('chai');

var expect = chai.expect;

describe('push test', function () {

    before(function () {
        var config = require('../config.js');
        var oldApiPort = config.api_port;
        config.api_port = 0;
        global.pushService = require('../lib/push-server.js')(config);
        config.io_port = config.io_port + 1;
        config.api_port = oldApiPort;
        global.apiService = require('../lib/push-server.js')(config);
        global.apiUrl = 'http://localhost:' + config.api_port;
        global.pushClient = require('socket.io-push-client')('http://localhost:' + config.io_port, {
            transports: ['websocket', 'polling'],
            useNotification: true
        });

    });

    after(function () {
        global.apiService.close();
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

        request
            .post(apiUrl + '/api/uid/bind')
            .send({
                pushId: pushClient.pushId,
                uid: 1
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
                pushClient.disconnect();
                pushClient.connect();
                pushClient.on('connect', function (data) {
                    expect(data.uid).to.equal("1");
                    request
                        .post(apiUrl + '/api/uid/bind')
                        .send({
                            pushId: pushClient.pushId,
                            uid: 2
                        })
                        .set('Accept', 'application/json')
                        .end(function (err, res) {
                            expect(res.text).to.be.equal('{"code":"success"}');
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
        request
            .post(apiUrl + '/api/uid/remove')
            .send({
                pushId: pushClient.pushId
            })
            .set('Accept', 'application/json')
            .end(function () {
                pushClient.connect();
                pushClient.on('connect', function (data) {
                    expect(data.uid).to.be.undefined;
                    pushClient.connect();
                    done();
                });
            });


    });

});
