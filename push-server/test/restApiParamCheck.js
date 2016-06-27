var request = require('superagent');
var config = require('../config.js');
var apiUrl = 'http://localhost:' + config.api_port;
var chai = require('chai');
var expect = chai.expect;


describe('api param check', function () {

    before(function () {
        global.pushServer = require('../lib/push-server.js')(config);
    });

    after(function () {
        global.pushServer.close();
    });

    it('topic is required', function (done) {
        request
            .post(apiUrl + '/api/push')
            .send({
                pushId: '',
                pushAll: 'true',
                data: 'test',
                topic: ''
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(JSON.parse(res.text).code).to.be.equal("error");
                done();
            });
    });

    it('data is required', function (done) {
        request
            .post(apiUrl + '/api/push')
            .send({
                pushId: '',
                topic: 'www',
                data: ''
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(JSON.parse(res.text).code).to.be.equal("error");
                done();
            });
    });

    it('pushId is required', function (done) {
        request
            .post(apiUrl + '/api/push')
            .send({
                pushId: '',
                topic: '',
                data: 'wwww'
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(JSON.parse(res.text).code).to.be.equal("error");
                done();
            });
    });

    it('notification target is required', function (done) {
        request
            .post(apiUrl + '/api/notification')
            .send({
                notification: JSON.stringify({apn: {alert: 'wwww'}})
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(JSON.parse(res.text).code).to.be.equal("error");
                done();
            });
    });

    it('notification all success', function (done) {
        request
            .post(apiUrl + '/api/notification')
            .send({
                notification: JSON.stringify({apn: {alert: 'wwww'}}),
                pushAll: 'true'
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(JSON.parse(res.text).code).to.be.equal("success");
                done();
            });
    });

    it('notification tag success', function (done) {
        request
            .post(apiUrl + '/api/notification')
            .send({
                notification: JSON.stringify({apn: {alert: 'wwww'}}),
                tag: 'abc'
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(JSON.parse(res.text).code).to.be.equal("success");
                done();
            });
    });

    it('notification no target error success', function (done) {
        request
            .post(apiUrl + '/api/notification')
            .send({
                notification: JSON.stringify({apn: {alert: 'wwww'}})
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(JSON.parse(res.text).code).to.be.equal("error");
                done();
            });
    });

});
