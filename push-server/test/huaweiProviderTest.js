var config = {
    client_id: 10513719,
    client_secret: "9l7fwfxt0m37qt61a1rh3w0lg9hjza1l"
}

describe('huawei test', function () {

    it('test ttl to single', function (done) {
        var huaweiProvider = require('../lib/service/huaweiProvider.js')(config);
        var notification = {};
        var timeToLive = 10000;
        huaweiProvider.sendAll(notification,timeToLive,function(){
            done();
        });
    });

});
