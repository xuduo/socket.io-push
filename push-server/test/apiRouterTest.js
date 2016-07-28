var request = require('superagent');

var chai = require('chai');

var expect = chai.expect;

describe('apiRouterTest', function () {

    before(function () {
        global.pushService = require('../lib/push-server.js')();
        global.pushService.api.apiRouter.maxPushIds = 3;
        global.apiUrl = 'http://localhost:' + pushService.api.port;
        global.pushClient = require('socket.io-push-client')('http://localhost:' + pushService.proxy.port, {
            transports: ['websocket', 'polling'],
            useNotification: true
        });
    });

    after(function () {
        global.pushService.close();
        global.pushClient.disconnect();
    });

    it('send notification', function (done) {
        pushClient.on('connect', function () {
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
