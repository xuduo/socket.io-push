var expect = require('chai').expect;

describe('RedisIntervalLockTest', function () {

    before(function () {
        var config = require('../config');
        global.redis = require('../lib/redis/simpleRedisHashCluster')(config.redis);
        global.lock1 = require('../lib/util/redisIntervalLock')(redis, "id1");
        global.lock2 = require('../lib/util/redisIntervalLock')(redis, "id2");
        global.lock3 = require('../lib/util/redisIntervalLock')(redis, "id3");

    });

    it('test1', function (done) {
        const interval = lock1.setInterval("test1", 100, ()=> {
            done();
            clearInterval(interval);
        });

    });

    it('test2', function (done) {
        let count = 0;
        const interval1 = lock2.setInterval("test2", 50, ()=> {
            count++;
        });
        const interval2 = lock1.setInterval("test2", 50, ()=> {
            count++;
        });

        const interval3 = lock3.setInterval("test2", 50, ()=> {
            count++;
        });

        setTimeout(()=> {
            expect(count).to.be.equal(10);
            clearInterval(interval1);
            clearInterval(interval2);
            clearInterval(interval3);
            done();
        }, 530);
    });

});
