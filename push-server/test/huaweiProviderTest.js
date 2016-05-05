var config = {
    client_id: 10513719,
    client_secret: "9l7fwfxt0m37qt61a1rh3w0lg9hjza1l"
}

describe('huawei test', function () {

    it('test ttl to single', function (done) {
        var huaweiProvider = require('../lib/service/huaweiProvider.js')(config);
        var notificationAll = {
            android: {title: "sendAll", message: "sendAll Msg", payload: {test: "wwwwqqq"}}
        };
        var timeToLive = 10000;
        huaweiProvider.sendAll(notificationAll, timeToLive, function () {
            var notificationOne = {
                android: {title: "sendOne", message: "sendOne Msg", payload: {test: "wwwwqqq"}}
            };
            huaweiProvider.sendOne(notificationOne, {token: "03574580439242232000001425000001"}, 60 * 60 * 1000, function () {
                done();
            });
        });
    });

});
