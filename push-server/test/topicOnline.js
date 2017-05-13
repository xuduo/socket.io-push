let request = require('request');
var io = require('socket.io');
const mongo = require('../lib/mongo/mongo')(require('../config-api').mongo);
var topicOnline = require('../lib/stats/topicOnline.js')(mongo, io, 'Ys7Gh2NwDY9Dqti92ZwxJh8ymQL4mmZ2 ', {'topic:': "devices"});
var topicOnline1 = require('../lib/stats/topicOnline.js')(mongo, io, 'Ys7Gh2NwDY9Dqti92ZwxJh8ymQL4mmZ3 ', {'topic:': "count"});
let defSetting = require('./defaultSetting');
var chai = require('chai');
var expect = chai.expect;

describe('api topicOnline', () => {

    before(() => {
        global.apiServer = defSetting.getDefaultApiServer();
        global.apiUrl = defSetting.getDefaultApiUrl();
    });

    after(() => {
        apiServer.close();
    });

    var data = {"topic:Test1": {length: 3}, "topic:Test2": {length: 4}};

    it('Test topicOnline', (done) => {
        topicOnline.writeTopicOnline(data);
        topicOnline1.writeTopicOnline(data);
        setTimeout(() => {
            topicOnline.getTopicOnline('topic:Test1', (result) => {
                expect(result).to.be.equal(6);
                topicOnline.getTopicOnline('xxxx', (result) => {
                    expect(result).to.be.equal(0);
                    topicOnline.getTopicOnline('topic:Test2', (result) => {
                        expect(result).to.be.equal(8);
                        done();
                    });
                });
            });
        }, 1000);

    });

    it('Test topicDevices data ', (done) => {
        topicOnline.getTopicDevices('topic:Test1', (result) => {
            expect(result.total).to.be.equal(0);
            expect(result.topic).to.be.equal('topic:Test1');
            done();
        });
    });

    it('Test topicOnline data timeOut', (done) => {
        topicOnline.timeValidWithIn = 0;
        topicOnline.writeTopicOnline(data);
        topicOnline1.timeValidWithIn = 0;
        topicOnline1.writeTopicOnline(data);
        setTimeout(() => {
            topicOnline.getTopicOnline('topic:Test1', (result) => {
                expect(result).to.be.equal(0);
                done();
            });
        }, 200);
    });

    it('topic onelie restapi', (done) => {
        request({
            url: apiUrl + '/api/topicOnline',
            method: 'get',
            form: {topic: 'whocares'}
        }, (error, response, body) => {
            let ret = JSON.parse(body);
            expect(ret.count).to.be.equal(0);
            expect(ret.topic).to.be.equal('whocares');
            done();
        })
    });

    it('topic online restapi with wrong param', (done) => {
        request({
            url: apiUrl + '/api/topicOnline',
            method: 'get',
        }, (error, response, body) => {
            let ret = JSON.parse(body);
            expect(ret.code).to.be.equal('error');
            done();
        })
    });

    it('device online restapi', (done) => {
        request({
            url: apiUrl + '/api/topicDevices',
            method: 'get',
            form: {topic: 'whocares'}
        }, (error, response, body) => {
            let ret = JSON.parse(body);
            expect(ret.total).to.be.equal(0);
            expect(ret.topic).to.be.equal('whocares');
            expect(ret.devices).to.be.array;
            done();
        })
    });

    it('devices online restapi with wrong param', (done) => {
        request({
            url: apiUrl + '/api/topicDevices',
            method: 'get',
        }, (error, response, body) => {
            let ret = JSON.parse(body);
            expect(ret.code).to.be.equal('error');
            done();
        })
    });
});
