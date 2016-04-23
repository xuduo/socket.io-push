var request = require('superagent');
var randomstring = require("randomstring");

var chai = require('chai')
    , spies = require('chai-spies');
chai.use(spies);
var expect = chai.expect;

var config = require('../config.js');
var fs = require('fs');
var ips = [];

config.ipFileName.forEach(function (ipFile) {

    var input = fs.readFileSync(ipFile).toString();

    input.split('\n').forEach(function (ip) {
        if (ip) {
            ips.push(ip);
        }
    });
});

describe('长连接Socket IO的测试', function () {
    for (var i = 0; i < ips.length; i++) {
        var ip = ips[i];
        for (var k = 0; k < config.ips.length; k++) {
            var testip = config.ips[k];
            var socket = require('socket.io-push/lib/push-client.js')('http://' + ip, {
                transports: ['websocket'], extraHeaders: {
                    Host: config.ioHost
                }, useNotification: true
            });
            it(JSON.stringify({socketIP: ip, type: 'connect', apiIP: testip}), function (done) {
                socket.on('connect', function (data) {
                    expect(data.pushId).to.be.equal(socket.pushId);
                    done();
                });
            });

            it(JSON.stringify({socketIP: ip, type: 'push', apiIP: testip, pushId: socket.pushId}), function (done) {
                request
                    .post(testip + '/api/push')
                    .send({
                        pushId: socket.pushId,
                        json: '{"message":"ok"}'
                    })
                    .set('Accept', 'application/json')
                    .set('Host', config.apiHost)
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res.text).to.be.equal('{"code":"success"}');
                    });

                socket.on('push', function (topic, data) {
                    expect(data.message).to.equal('ok');
                    done();
                });
            });


            it(JSON.stringify({
                socketIP: ip,
                type: 'notification',
                apiIP: testip,
                pushId: socket.pushId
            }), function (done) {
                var title = 'hello',
                    message = 'hello world';
                var data = {
                    "android": {"title": title, "message": message},
                    "apn": {"alert": message, "badge": 5, "sound": "default", "payload": {}}
                }
                var str = JSON.stringify(data);

                request
                    .post(testip + '/api/notification')
                    .send({
                        pushId: socket.pushId,
                        notification: str
                    })
                    .set('Accept', 'application/json')
                    .set('Host', config.apiHost)
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res.text).to.equal('{"code":"success"}');
                    });

                socket.on('notification', function (data) {
                    expect(data.android.title).to.be.equal(title);
                    expect(data.android.message).to.be.equal(message);
                    socket.disconnect();
                    done();
                })
            });


        }

    }

});