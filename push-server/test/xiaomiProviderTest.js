var config = {
    app_secret: "ynJJ6b+MkCLyw1cdrg/72w=="
}

describe('xiaomi test', function () {

    it('sendAll', function (done) {
        var xiaomiProvider = require('../lib/service/xiaomiProvider.js')(config);
        var notificationAll = {
            android: {title: "sendAll", message: "sendAll Msg", payload: {test: "wwwwqqq"}}
        };
        var timeToLive = 10000;
        xiaomiProvider.sendAll(notificationAll, timeToLive, function () {
            done();
        });
    });

    it('sendOne', function (done) {
        var xiaomiProvider = require('../lib/service/xiaomiProvider.js')(config);
        var notificationOne = {
            android: {title: "sendOne", message: "sendOne Msg", payload: {test: "wwwwqqq"}}
        };
        xiaomiProvider.sendOne(notificationOne, {token: "mQO6QyoRCz/Mazl83rjqph2fXSlxqaJ7hy/rnqEeMjo="}, 60 * 60 * 1000, function () {
            done();
        });
    });

});
