var request = require('superagent');
var config = require('../config.js');
var apiUrl = 'http://localhost:' + config.api_port;
var chai = require('chai');
var expect = chai.expect;


describe('api auth', function () {

    before(function () {
        global.pushServer = require('../lib/push-server.js')(config);
    });

    after(function () {
        global.pushServer.close();
    });

    it('check should pass', function (done) {
        request
            .post(apiUrl + '/api/push')
            .send({
                pushId: '',
                pushAll: 'true',
                topic: 'message',
                data: 'test'
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(JSON.parse(res.text).code).to.be.equal("success");
                done();
            });
    });


    it('check should not pass', function (done) {

        var apiCheckDenyAll = function (path, req) {
            return false;
        }

        pushServer.restApi.apiAuth = apiCheckDenyAll;

        request
            .post(apiUrl + '/api/push')
            .send({
                pushId: '',
                pushAll: 'true',
                topic: 'message',
                data: 'test'
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(JSON.parse(res.text).code).to.be.equal("error");
                request
                    .post(apiUrl + '/api/notification')
                    .send({
                        pushId: '',
                        pushAll: 'true',
                        topic: 'message',
                        data: 'test'
                    })
                    .set('Accept', 'application/json')
                    .end(function (err, res) {
                        expect(JSON.parse(res.text).code).to.be.equal("error");
                        done();
                    });
            });


    });

    it('check ip', function (done) {

        var ipList = ['127.0.0.1', '127.0.0.2'];
        var apiCheckIp = function (path, req, logger) {
            var ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
            logger.debug("%s caller ip %s", path, ip);
            if (req.params.pushAll == 'true') {
                return ipList.indexOf(ip) != -1;
            } else {
                return true;
            }
        }

        pushServer.restApi.apiAuth = apiCheckIp;

        request
            .post(apiUrl + '/api/push')
            .send({
                pushId: '',
                pushAll: 'true',
                topic: 'message',
                data: 'test'
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(JSON.parse(res.text).code).to.be.equal("error");
            });

        request
            .post(apiUrl + '/api/push')
            .send({
                pushId: 'test',
                topic: 'message',
                data: 'test'
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(JSON.parse(res.text).code).to.be.equal("success");
            });

        request
            .post(apiUrl + '/api/push')
            .send({
                pushId: '',
                pushAll: 'true',
                topic: 'message',
                data: 'test'
            })
            .set('X-Real-IP', '127.0.0.2')
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(JSON.parse(res.text).code).to.be.equal("success");
                done();
            });
    });


});
