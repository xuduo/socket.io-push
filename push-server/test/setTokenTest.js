
var chai = require('chai');

var expect = chai.expect;

describe('unsubscribe test', function () {

    before(function () {
        global.pushService = require('../lib/push-server')();
        global.apiUrl = 'http://localhost:' + pushService.api.port;
        global.pushClient = require('socket.io-push-client')('http://localhost:' + pushService.proxy.port, {
            transports: ['websocket', 'polling'],
            useNotification: true
        });
    });

    after(function () {
        global.pushService.close();
        global.pushClient.disconnect();
    });

    it('set apn token', function (done) {
        pushClient.on('connect', function (data) {
            expect(data.pushId).to.be.equal(pushClient.pushId);
            pushClient.socket.emit("token", {token: "testToken", type: "testType"});
            var notificationService = pushService.api.notificationService;
            setTimeout(function () {
                notificationService.getTokenDataByPushId(pushClient.pushId, function (token) {
                    expect(token.token).to.equal("testToken");
                    done();
                });
            }, 100);
        });

    });

});
