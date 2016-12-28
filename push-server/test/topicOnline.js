let request = require('request');
var Redis = require('ioredis');
var redis = new Redis();
var io = require('socket.io');
var topicOnline = require('../lib/stats/topicOnline.js')(redis, io, 'Ys7Gh2NwDY9Dqti92ZwxJh8ymQL4mmZ2 ', ['topic:', 'message']);
var topicOnline1 = require('../lib/stats/topicOnline.js')(redis, io, 'Ys7Gh2NwDY9Dqti92ZwxJh8ymQL4mmZ3 ', ['topic:', 'message']);
let defSetting = require('./defaultSetting');
var chai = require('chai');
var expect = chai.expect;

describe('api topicOnline', () =>{

    before(() => {
        global.apiServer = defSetting.getDefaultApiServer();
        global.apiUrl = defSetting.getDefaultApiUrl();
    });

    after(() => {
        apiServer.close();
    });

    var data = {"topic:Test1": {length: 3}, "testTopic2": {length: 4}};

    it('Test topicOnline', (done) => {
        topicOnline.writeTopicOnline(data);
        topicOnline1.writeTopicOnline(data);
        setTimeout(() => {
            topicOnline.getTopicOnline('topic:Test1', (result) => {
                expect(result).to.be.equal(6);
                topicOnline.getTopicOnline('xxxx', (result) => {
                    expect(result).to.be.equal(0);
                    topicOnline.getTopicOnline('testTopic2', (result) => {
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
        topicOnline.timeValidWithIn = 500;
        setTimeout(() => {
            topicOnline.getTopicOnline('topic:Test1', (result) => {
                expect(result).to.be.equal(0);
                done();
            });
        }, 1000);
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
