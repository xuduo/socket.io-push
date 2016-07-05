var request = require('superagent');

var chai = require('chai');

var expect = chai.expect;

describe('push test', function () {

    before(function () {
        global.config = require('../config.js');
        config.routerMaxPushIds = 3;
        global.pushService = require('../lib/push-server.js')(config);
        global.apiUrl = 'http://localhost:' + config.api_port;
        global.pushClient = require('../lib/client/push-client.js')('http://localhost:' + config.io_port, {
            transports: ['websocket', 'polling'],
            useNotification: true
        });
    });

    after(function () {
        global.pushService.close();
        global.pushClient.disconnect();
    });

    it('send notification', function (done) {
        pushClient.on('connect', function (data) {
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


            request
                .post(apiUrl + '/api/notification')
                .send({
                    pushId: JSON.stringify(["a", "b", "c", "x", "d", "e", pushClient.pushId]),
                    notification: str
                })
                .set('Accept', 'application/json')
                .end(function (err, res) {
                    expect(res.text).to.be.equal('{"code":"success"}');
                });
        });

    });


});
