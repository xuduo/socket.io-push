describe('huawei test', function () {

    it('test ttl to single', function (done) {
        var huaweiProvider = require('../lib/service/huaweiProvider.js')();
        huaweiProvider.sendAll();
        setTimeout(function () {
            done();
        }, 500);
    });

});
