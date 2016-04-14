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
var socket, pushId;

for (var i = 0; i <ips.length; i++) {
    var ip = ips[i];
    for(var k = 0; k<config.ips.length; k++) {
        var testip = config.ips[k];
        describe('长连接Socket IO的测试', function () {
            it(JSON.stringify({socketIP: ip, type: 'connect', apiIP: testip}), function (done) {
                socket = require('socket.io-client')('http://' + ip, {
                    transports: ['websocket'], extraHeaders: {
                        Host: config.ioHost
                    }
                });
                pushId = randomstring.generate(24);
                socket.on('connect', function () {
                    socket.emit('pushId', {id: pushId, version: 1, platform: "android", topics: ['message', "noti"]});
                });
                socket.on('pushId', function (data) {
                    expect(data.id).to.be.equal(pushId);
                    done();
                });
            });

            it(JSON.stringify({socketIP: ip, type: 'push', apiIP:testip}), function (done) {
                var b = new Buffer('{"message":"ok"}');
                var data = b.toString('base64');
                request
                    .post(testip + '/api/push')
                    .send({
                        pushId: pushId,
                        topic: 'message',
                        data: data
                    })
                    .set('Accept', 'application/json')
                    .set('Host', config.apiHost)
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res.text).to.be.equal('{"code":"success"}');
                    });

                socket.on('push', function (data) {
                    var str = new Buffer(data.data, 'base64').toString();
                    expect(str).to.be.equal('{"message":"ok"}');
                    done();
                });
            });


            it(JSON.stringify({socketIP: ip, type: 'notification', apiIP:testip}), function (done) {
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
                        pushId: pushId,
                        uid: '',
                        notification: str
                    })
                    .set('Accept', 'application/json')
                    .set('Host', config.apiHost)
                    .end(function (err, res) {
                        expect(err).to.be.null;
                        expect(res.text).to.be.equal('{"code":"success"}');
                    });

                socket.on('noti', function (data) {
                    expect(data.android.title).to.be.equal(title);
                    expect(data.android.message).to.be.equal(message);
                    socket.disconnect();
                    done();
                })
            });

        });
    }

}

