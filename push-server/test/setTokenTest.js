var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('set token test', function () {

    before(function () {
        global.pushService = defSetting.getDefaultPushService();
        global.apiUrl = defSetting.getDefaultApiUrl();
        global.pushClient = defSetting.getDefaultPushClient();
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
