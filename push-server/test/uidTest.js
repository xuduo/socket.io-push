var request = require('superagent');
var config = require('../config.js');

var chai = require('chai');

var expect = chai.expect;
var pushClient;

describe('push test', function () {

    before(function () {
        var config = require('../config.js');
        var oldApiPort = config.api_port;
        config.api_port = 0;
        global.pushService = require('../lib/push-server.js')(config);
        config.io_port = config.io_port + 1;
        config.api_port = oldApiPort;
        global.apiService = require('../lib/push-server.js')(config);
        global.apiUrl = 'http://localhost:' + config.api_port;

    });

    after(function () {
        global.apiService.close();
        global.pushService.close();
    });

    it('connect', function (done) {
        pushClient = require('../lib/client/push-client.js')('http://localhost:' + config.io_port, {
            transports: ['websocket', 'polling'],
            useNotification: true
        });
        pushClient.on('connect', function (data) {
            expect(data.uid).to.be.undefined;
            done();
        });

    });

    it('bind uid', function (done) {

        request
            .post(apiUrl + '/api/addPushIdToUid')
            .send({
                pushId: pushClient.pushId,
                uid: 1
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
                pushClient.disconnect();
                pushClient.connect();
                pushClient.on('connect', function (data) {
                    expect(data.uid).to.equal("1");
                    done();
                });
            });

    });

    it('unbind uid', function (done) {

        pushClient.unbindUid();
        pushClient.disconnect();
        pushClient.connect();
        pushClient.on('connect', function (data) {
            expect(data.uid).to.be.undefined;
            pushClient.connect();
            done();
        });

    });

});
