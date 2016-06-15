var config = {
    app_secret: "ynJJ6b+MkCLyw1cdrg/72w=="
}

describe('xiaomi test', function () {

    before(function () {
        var config = require('../config.js');
        global.pushService = require('../lib/push-server.js')(config);
        global.xiaomiProvider = pushService.xiaomiProvider;
        global.apiUrl = 'http://localhost:' + config.api_port;
    });

    after(function () {
        global.pushService.close();
    });


    it('sendAll', function (done) {
        var notificationAll = {
            android: {title: "sendAll", message: "sendAll Msg", payload: {test: "wwwwqqq"}}
        };
        var timeToLive = 10000;
        xiaomiProvider.sendAll(notificationAll, timeToLive, function () {
            done();
        });
    });

    it('sendOne', function (done) {
        var notificationOne = {
            android: {title: "sendOne", message: "sendOne Msg", payload: {test: "wwwwqqq"}}
        };
        xiaomiProvider.sendOne(notificationOne, {token: "mQO6QyoRCz/Mazl83rjqph2fXSlxqaJ7hy/rnqEeMjo="}, 60 * 60 * 1000, function () {
            done();
        });
    });

});
