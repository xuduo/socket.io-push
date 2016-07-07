var request = require('superagent');

var chai = require('chai');

var expect = chai.expect;

describe('apn send one', function () {

    before(function () {
        var config = require('../config.js');
        global.apiUrl = 'http://localhost:' + config.api_port;
        global.pushService = require('../lib/push-server.js')(config);
        global.pushClient = require('../lib/client/push-client.js')('http://localhost:' + config.io_port);
        global.pushClient2 = require('../lib/client/push-client.js')('http://localhost:' + config.io_port);

        global.pushClient2.on('connect', function () {
            pushClient2.socket.emit("token", {token: 'ffff', bundleId: "com.xuduo.pushtest", type: 'apn'}); //这里emit可能比下面的request还晚,所以可能出问题
            pushClient2.on('notification', function () {
            });
        })

    });

    after(function () {
        global.pushService.close();
        global.pushClient.disconnect();
        global.pushClient2.disconnect();
    });

    it('test send one', function (done) {
        pushClient.on('connect', function () {
            pushClient.socket.emit("token", {token: "eeee", bundleId: "com.xuduo.pushtest", type: "apn"});
            var data = {
                "apn": {alert: "wwww"}
            }
            var str = JSON.stringify(data);

            pushClient.on('notification', function () {
                expect("do not receive").to.be.false
            });

            request
                .post(apiUrl + '/api/notification')
                .send({
                    pushId: [pushClient.pushId, pushClient2.pushId],
                    //pushId: pushClient2.pushId,
                    notification: str
                })
                .set('Accept', 'application/json')
                .end(function (err, res) {
                    expect(res.text).to.be.equal('{"code":"success"}');
                    done();
                });
        });

    });


});
