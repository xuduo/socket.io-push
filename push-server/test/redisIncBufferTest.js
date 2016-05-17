var chai = require('chai');
var expect = chai.expect;


describe('test redisIncBuffer', function () {

    it('base test', function (done) {
        var redis = require('../lib/redis/simpleRedisHashCluster.js')(require('../config.js').redis);
        var incBuffer = require('../lib/stats/redisIncrBuffer.js')(redis);
        incBuffer.commitThreshold = 50;
        redis.set("incBufferTest", 1, function () {
            incBuffer.incrby("incBufferTest", 1);
            incBuffer.incrby("incBufferTest", 1);
            incBuffer.incrby("incBufferTest", 1);
            redis.get("incBufferTest", function (err, value) {
                expect(value.toString()).to.equal('1');
                setTimeout(function () {
                    incBuffer.incrby("incBufferTest", 2);
                    setTimeout(function () {
                        redis.get("incBufferTest", function (err, value) {
                            expect(value.toString()).to.equal('6');
                            done();
                        });
                    }, 50);
                }, 100);
            });
        });
    });


});
