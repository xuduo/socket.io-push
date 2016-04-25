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
                var socket = require('socket.io-push/lib/push-client.js')('http://' + ip, {
                    transports: ['websocket'], extraHeaders: {
                        Host: config.ioHost
                    }, useNotification: true
                });

                socket.on('push', function (topic, data) {
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
                            expect(err).to.be.null;
                            expect(res.text).to.be.equal('{"code":"success"}');
                        });
                });
            });
        }
    }
});
