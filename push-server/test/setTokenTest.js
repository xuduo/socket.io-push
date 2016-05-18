
var chai = require('chai');

var expect = chai.expect;

describe('unsubscribe test', function () {

    before(function () {
        var config = require('../config.js');
        global.pushService = require('../lib/push-server.js')(config);
        global.apiUrl = 'http://localhost:' + config.api_port;
        global.pushClient = require('../lib/client/push-client.js')('http://localhost:' + config.io_port);

    });

    after(function () {
        global.pushService.close();
        global.pushClient.disconnect();
    });

    it('set apn token', function (done) {
        pushClient.on('connect', function (data) {
            expect(data.pushId).to.be.equal(pushClient.pushId);
            pushClient.socket.emit("token", {token: "testToken", type: "testType"});
            var notificationService = pushService.notificationService;
            setTimeout(function () {
                notificationService.getTokenDataByPushId(pushClient.pushId, function (token) {
                    expect(token.token).to.equal("testToken");
                    done();
                });
            }, 100);
        });

    });

});
