var Redis = require('ioredis');
var redis = new Redis();
var io = require('socket.io');
var topicOnline = require('../lib/stats/topicOnline.js')(redis, io, 'Ys7Gh2NwDY9Dqti92ZwxJh8ymQL4mmZ2 ', ['topic:', 'message']);
var topicOnline1 = require('../lib/stats/topicOnline.js')(redis, io, 'Ys7Gh2NwDY9Dqti92ZwxJh8ymQL4mmZ3 ', ['topic:', 'message']);

var chai = require('chai');
var expect = chai.expect;

describe('api topicOnline', () =>{

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
                        expect(result).to.be.equal(0);
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
});
