var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('api param check', function () {

    before(() => {
        global.apiServer = defSetting.getDefaultApiServer();
        global.apiUrl = defSetting.getDefaultApiUrl();
    });

    after(() => {
        global.apiServer.close();
    });

    it('topic is required', function (done) {

        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                pushId: '',
                pushAll: 'true',
                data: 'test',
                topic: ''
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("error");
            done();
        });

    });

    it('data is required', function (done) {

        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                pushId: '',
                topic: 'www',
                data: ''
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("error");
            done();
        });

    });

    it('pushId is required', function (done) {

        request({
            url: apiUrl + '/api/push',
            method: "post",
            form: {
                pushId: '',
                topic: '',
                data: 'wwww'
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("error");
            done();
        });

    });

    it('notification target is required', function (done) {

        request({
            url: apiUrl + '/api/notification',
            method: "post",
            form: {
                notification: JSON.stringify({apn: {alert: 'wwww'}})
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("error");
            done();
        });

    });

    it('notification all success', function (done) {

        request({
            url: apiUrl + '/api/notification',
            method: "post",
            form: {
                notification: JSON.stringify({apn: {alert: 'wwww'}}),
                pushAll: 'true'
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
            done();
        });

    });

    it('notification tag success', function (done) {

        request({
            url: apiUrl + '/api/notification',
            method: "post",
            form: {
                notification: JSON.stringify({apn: {alert: 'wwww'}}),
                tag: 'abc'
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("success");
            done();
        });

    });

    it('notification no target error success', function (done) {

        request({
            url: apiUrl + '/api/notification',
            method: "post",
            form: {
                notification: JSON.stringify({apn: {alert: 'wwww'}})
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal("error");
            done();
        });

    });

});
