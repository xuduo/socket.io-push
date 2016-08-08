var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('apn test', function () {

    before(function () {
        global.pushService = defSetting.getDefaultPushService();
        global.apiUrl = defSetting.getDefaultApiUrl();
        global.pushClient = defSetting.getDefaultPushClient();
    });

    after(function () {
        global.pushService.close();
        global.pushClient.disconnect();
    });


    it('test send all', function (done) {
        pushClient.on('connect', function () {
            pushClient.socket.emit("token", {token: "ffffff", bundleId: "com.xuduo.pushtest", type: "apn"});
            var data = {
                "apn": {alert: "wwww"}
            }
            var str = JSON.stringify(data);

            pushClient.on('notification', function () {
                expect("do not receive").to.be.false
            });


            request({
                url: apiUrl + '/api/notification',
                method: "post",
                headers: {
                    'Accept': 'application/json'
                },
                form: {
                    pushAll: 'true',
                    notification: str
                }
            }, (error, response, body) => {
                expect(JSON.parse(body).code).to.be.equal("success");
                done();
            });
        });

    });

});
