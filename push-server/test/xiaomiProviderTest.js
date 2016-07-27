describe('xiaomi test', function () {

    before(function () {
        global.config = require('../config-api');
        global.apiServer = require('../lib/api')(config);
        global.apiUrl = 'http://localhost:' + apiServer.port;
        global.xiaomiProvider = apiServer.xiaomiProvider;
    });

    after(function () {
        global.apiServer.close();
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

    it('sendMany', function (done) {
        var notificationOne = {
            android: {title: "sendOne", message: "sendOne Msg", payload: {test: "wwwwqqq"}}
        };
        xiaomiProvider.sendMany(notificationOne, [{token: "mzxxxzoRCz/Mazl83rjqph2fXSlxqaJ7hy/rnqEeMjo="}, {token: "mQO6QyoRCz/Mazl83rjqph2fXSlxqaJ7hy/rnqEeMjo="}], 60 * 60 * 1000, function () {
            done();
        });
    });

});
