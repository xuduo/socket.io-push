var request = require('superagent');
require('../lib/log/index.js')();
var config = require('../config.js');
var oldApiPort = config.api_port;
var pushService = require('../lib/push-server.js')(config);

var apiUrl = 'http://localhost:' + config.api_port;

var chai = require('chai');
var randomstring = require("randomstring");
var expect = chai.expect;

describe('push test', function () {

    it('test ttl to topic', function (done) {

        request
            .post(apiUrl + '/api/push')
            .send({
                pushAll: "true",
                topic: 'message',
                json: JSON.stringify({message: 1}),
                timeToLive: 10000
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
                var pushClient = require('../lib/push-client.js')('http://localhost:' + config.io_port, {
                    transports: ['websocket', 'polling'],
                    useNotification: true
                });
                pushClient.subscribeTopicAndReceiveTTL("message");
                pushClient.on('push', function (topic, data) {
                    expect(data.message).to.equal(2);
                    var send = false;
                    pushClient.on("disconnect", function () {
                        console.log("pushClient.on(disconnect");
                        if(!send){
                            send = true;
                            request
                                .post(apiUrl + '/api/push')
                                .send({
                                    pushAll: "true",
                                    topic: 'message',
                                    json: JSON.stringify({message: 3}),
                                    timeToLive: 10000
                                })
                                .set('Accept', 'application/json').end(function () {
                                expect(res.text).to.be.equal('{"code":"success"}');
                                pushClient.connect();
                                pushClient.on('push', function (topic, data) {
                                    expect(data.message).to.equal(3);
                                    done();
                                });
                            });
                        }
                    });
                    pushClient.disconnect();

                });
                setTimeout(function () { // send while online
                    request
                        .post(apiUrl + '/api/push')
                        .send({
                            pushAll: "true",
                            topic: 'message',
                            json: JSON.stringify({message: 2}),
                            timeToLive: 10000
                        })
                        .set('Accept', 'application/json').end();
                }, 100);

            });
    });


});
