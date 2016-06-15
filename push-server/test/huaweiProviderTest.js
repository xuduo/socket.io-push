var config = [{
    package_name: "com.yy.misaka.demo",
    client_id: 10513719,
    client_secret: "9l7fwfxt0m37qt61a1rh3w0lg9hjza1l"
}]

describe('huawei test', function () {

    before(function () {
        var config = require('../config.js');
        global.pushService = require('../lib/push-server.js')(config);
        global.huaweiProvider = pushService.huaweiProvider;
        global.apiUrl = 'http://localhost:' + config.api_port;
    });

    after(function () {
        global.pushService.close();
    });

    it('huawei', function (done) {
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
