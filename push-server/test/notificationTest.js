var request = require('superagent');

var chai = require('chai');

var expect = chai.expect;

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
        global.pushClient = require('../lib/client/push-client.js')('http://localhost:' + config.io_port, {
            transports: ['websocket', 'polling'],
            useNotification: true
        });
        global.pushClient2 = require('../lib/client/push-client.js')('http://localhost:' + config.io_port, {
            transports: ['websocket', 'polling'],
            useNotification: true
        });

    });

    after(function () {
        global.apiService.close();
        global.pushService.close();
        global.pushClient.disconnect();
        global.pushClient2.disconnect();
    });

    it('connect', function (done) {
        pushClient.on('connect', function (data) {
            expect(data.pushId).to.be.equal(pushClient.pushId);
            done();
        });

    });


    it('bind uid', function (done) {

        request
            .post(apiUrl + '/api/uid/bind')
            .send({
                pushId: pushClient.pushId,
                uid: 1
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
                done();
            });
    });


    it('notification to pushId', function (done) {
        var title = 'hello',
            message = 'hello world';
        var data = {
            "android": {"title": title, "message": message}
        }
        var str = JSON.stringify(data);

        var notificationCallback = function (data) {
            expect(data.title).to.be.equal(title);
            expect(data.message).to.be.equal(message);
            done();
        }
        pushClient.on('notification', notificationCallback);


        request
            .post(apiUrl + '/api/notification')
            .send({
                pushId: pushClient.pushId,
                notification: str
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
    });

    it('Notification pushAll', function (done) {
        var title = 'hello',
            message = 'hello world';
        var data = {
            android: {"title": title, "message": message},
            payload :{"ppp": 123}
        }
        var str = JSON.stringify(data);

        var notificationCallback = function (data) {
            expect(data.title).to.be.equal(title);
            expect(data.message).to.be.equal(message);
            expect(data.payload.ppp).to.be.equal(123);
            done();
        }
        pushClient.on('notification', notificationCallback);

        request
            .post(apiUrl + '/api/notification')
            .send({
                pushId: '',
                pushAll: 'true',
                notification: str,
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(res.text).to.be.equal('{"code":"success"}');
            });
    });


});
