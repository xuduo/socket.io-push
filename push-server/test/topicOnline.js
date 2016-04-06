var config = require('../config.js');

var pushService = require('../lib/push-server.js')(config);
var redis = require('redis').createClient({
    host: '127.0.0.1',
    port: 6379,
    return_buffers: true,
    retry_max_delay: 3000,
    max_attempts: 0,
    connect_timeout: 10000000000000000
});
var io = require('socket.io');
var topicOnline = require('../lib/stats/topicOnline.js')(redis, io, 'Ys7Gh2NwDY9Dqti92ZwxJh8ymQL4mmZ2 ');

var chai = require('chai');
var expect = chai.expect;

describe('api topicOnline', function () {

    var data = {"testTopic1" : { length: 2},  "testTopic2" : { length:4}};

    it('Test topicOnline', function (done) {
        topicOnline.writeTopicOnline(data);
        setTimeout(function(){
            topicOnline.getTopicOnline('testTopic1', function(result){
                expect(result).to.be.equal(2);
                done();
            });
        }, 3000);

    });
});
