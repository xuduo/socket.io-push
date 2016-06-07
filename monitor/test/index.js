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

describe('test ', function () {

    for (var i = 0; i < ips.length; i++) {

        var ip = ips[i];
        for (var k = 0; k < config.ips.length; k++) {

            var testip = config.ips[k];

            it(JSON.stringify({socketIP: ip, type: 'connect', apiIP: testip}), function (done) {
                var socket = require('socket.io-push/lib/client/push-client.js')('http://' + ip, {
                    transports: ['websocket'], extraHeaders: {
                        Host: config.ioHost
                    }, useNotification: true, reconnection: false, connect_timeout: 2000
                });

                socket.socket.on('connect_timeout', function (data) {
                    console.log("connect_timeout_error ", ip, data.description);
                });

                socket.socket.on('connect_error', function (data) {
                    console.log("connect_error ", ip, data.description);
                });

                socket.on('push', function (data) {
                    expect(data.message).to.equal('ok');
                    socket.disconnect();
                    done();
                });

                socket.on('connect', function (data) {
                    expect(data.pushId).to.be.equal(socket.pushId);
                    request
                        .post(testip + '/api/push')
                        .send({
                            pushId: socket.pushId,
                            json: '{"message":"ok"}'
                        })
                        .set('Accept', 'application/json')
                        .set('Host', config.apiHost)
                        .end(function (err, res) {
                            if (err) {
                                console.log('call_api_error ', err);
                            }
                            expect(err).to.be.null;
                            expect(res.text).to.be.equal('{"code":"success"}');
                        });
                });
            });
        }
    }
});
