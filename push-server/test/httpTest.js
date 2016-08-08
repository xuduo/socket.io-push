var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('http test', function () {

    before(function () {
        global.pushService = defSetting.getDefaultPushService();
        global.pushService.api.apiRouter.maxPushIds = 3;
        global.apiUrl = defSetting.getDefaultApiUrl();
        global.pushClient = defSetting.getDefaultPushClient();
    });

    after(function () {
        global.pushService.close();
        global.pushClient.disconnect();
    });

    it('get', function (done) {
        pushClient.on("connect", function () {
            pushClient.http({
                method: "get",
                url: "http://localhost:" + pushService.api.port + "/api/echo",
                data: {param1: "value1", param2: "value2"}
            }, function (result) {
                expect(result.body.param1).to.be.equal("value1");
                expect(result.statusCode).to.be.equal(200);
                done();
            });
        });

    });

    it('post', function (done) {
        pushClient.http({
            method: "post",
            url: "http://localhost:" + pushService.api.port + "/api/echo",
            params: {param1: "value1", param2: "value2"}
        }, function (result) {
            expect(result.body.param1).to.be.equal("value1");
            expect(result.statusCode).to.be.equal(200);
            done();
        });
    });

    it('error', function (done) {
        pushClient.http({
            method: "post",
            url: "http://localhost2:" + pushService.api.port + "/api/echo",
            params: {param1: "value1", param2: "value2"}
        }, function (result) {
            expect(result.statusCode).to.be.equal(0);
            done();
        });
    });

});
