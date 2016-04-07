var config = require('../config.js');

var redis = require('redis').createClient();
var io = require('socket.io');
var topicOnline = require('../lib/stats/topicOnline.js')(redis, io, 'Ys7Gh2NwDY9Dqti92ZwxJh8ymQL4mmZ2 ', config.topicOnlineFilter);

var chai = require('chai');
var expect = chai.expect;

describe('api topicOnline', function () {

    var data = {"topic:Test1" : { length: 2},  "testTopic2" : { length:4}};

    it('Test topicOnline', function (done) {
        topicOnline.writeTopicOnline(data);

        setTimeout(function(){
            topicOnline.getTopicOnline('topic:Test1', function(result){
                expect(result).to.be.equal(2);
                topicOnline.getTopicOnline('xxxx', function(result){
                    expect(result).to.be.equal(0);
                    done();
                });
            });
        }, 500);

    });
});
