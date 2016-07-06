var expect = require('chai').expect;

describe('huawei test', function () {

    before(function () {
        global.config = require('../config.js');
        global.pushService = require('../lib/push-server.js')(config);
        global.huaweiProvider = pushService.huaweiProvider;
        global.apiUrl = 'http://localhost:' + config.api_port;
    });

    after(function () {
        global.pushService.close();
    });

    it('huawei send all ', function (done) {
        var notificationAll = {
            android: {title: "sendAll", message: "sendAll Msg", payload: {test: "wwwwqqq"}}
        };
        var timeToLive = 10000;
        var doneCount = 0;
        huaweiProvider.sendAll(notificationAll, timeToLive, function (error) {
            expect(error).to.not.be.ok;
            doneCount ++;
            if(doneCount == config.huawei.length){
                done();
            }
        });
    });
    it('huawei send one', function(done){
        var notificationOne = {
            android: {title: "sendOne", message: "sendOne Msg", payload: {test: "wwwwqqq"}}
        };
        huaweiProvider.sendMany(notificationOne, [{token: "0988774580439242232000001425000001", package_name:"com.yy.misaka.demo2"}], 60 * 60 * 1000, function (error) {
            expect(error).to.not.be.ok;
            done();
        });
    });

    it('huawei send many', function(done){
        var notificationOne = {
            android: {title: "sendOne", message: "sendOne Msg", payload: {test: "wwwwqqq"}}
        };
        var doneCount = 0;
        huaweiProvider.sendMany(notificationOne, [{token: "0988774580439242232000001425000001"},{token: "03574580439242232000001425000001"}], 60 * 60 * 1000, function (error) {
            expect(error).to.not.be.ok;
            if(++doneCount == 1)
                done();
        });
    });

    it('huawei send many2', function(done){
        var notificationOne = {
            android: {title: "sendOne", message: "sendOne Msg", payload: {test: "wwwwqqq"}}
        };
        var doneCount = 0;
        huaweiProvider.sendMany(notificationOne, [{token: "0988774580439242232000001425000001", package_name:"com.yy.misaka.demo2"},{token: "03574580439242232000001425000001"}], 60 * 60 * 1000, function (error) {
            expect(error).to.not.be.ok;
            if(++doneCount == 2)
                done();
        });
    });


});
