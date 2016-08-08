var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('apn send one', function () {

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

    it('test send one', function (done) {
        pushClient.on('connect', function () {
            pushClient.socket.emit("token", {token: "eeee", bundleId: "com.xuduo.pushtest", type: "apn"});
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
                    pushId: [pushClient.pushId, pushClient2.pushId],
                    notification: str
                }
            }, (error, response, body) => {
                expect(JSON.parse(body).code).to.be.equal("success");
                done();
            });
        });

    });


});
