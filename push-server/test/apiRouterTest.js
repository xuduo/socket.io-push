var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('apiRouterTest', function () {

    before(function () {
        global.proxyServer = defSetting.getDefaultProxyServer();
        global.apiServer = defSetting.getDefaultApiServer();
        global.apiServer.apiRouter.maxPushIds = 3;
        global.apiUrl = defSetting.getDefaultApiUrl();
        global.pushClient = defSetting.getDefaultPushClient();
    });

    after(function () {
        global.proxyServer.close();
        global.apiServer.close();
        global.pushClient.disconnect();
    });

    it('send notification', function (done) {
        pushClient.on('connect', function () {
            var title = 'hello',
                message = 'hello world';
            var data = {
                "android": {"title": title, "message": message},
                "payload": {"wwww": "qqqq"}
            }
            var str = JSON.stringify(data);

            var notificationCallback = function (data) {
                expect(data.title).to.be.equal(title);
                expect(data.message).to.be.equal(message);
                expect(data.payload.wwww).to.be.equal("qqqq");
                done();
            }
            pushClient.on('notification', notificationCallback);


            request({
                url: apiUrl + '/api/notification',
                method: "post",
                headers: {
                    'Accept': 'application/json'
                },
                form: {
                    pushId: JSON.stringify(["a", "b", "c", "d", "e", pushClient.pushId]),
                    notification: str
                }
            }, (error, response, body) => {
                expect(JSON.parse(body).code).to.be.equal("success");
            });
        });

    });


});
