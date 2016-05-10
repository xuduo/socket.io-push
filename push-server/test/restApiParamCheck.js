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
                pushAll: 'true',
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
                topic: 'www',
                data: 'wwww'
            })
            .set('Accept', 'application/json')
            .end(function (err, res) {
                expect(JSON.parse(res.text).code).to.be.equal("error");
                done();
            });
    });


});
