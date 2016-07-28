var chai = require('chai');
var request = require('superagent');
var expect = chai.expect;

describe('unsubscribe test', function () {

    before(function () {
        global.pushService = require('../lib/push-server.js')({
            proxy: require("../config-proxy"),
            api: require("../config-api")
        });
        global.apiUrl = 'http://localhost:' + pushService.api.port;
        global.stats = pushService.proxy.stats;
        stats.redis.del("stats#sessionCount");

        stats.redisIncrBuffer.commitThreshold = 0;
        global.pushClient = require('socket.io-push-client')('http://localhost:' + pushService.proxy.port, {
            transports: ['websocket', 'polling'],
            useNotification: true
        });
    });

    after(function () {
        global.pushService.close();
        global.pushClient.disconnect();
    });

    it('sessionCount test', function (done) {
        pushClient.on('connect', function () {
            stats.writeStatsToRedis();
            stats.getSessionCount(function (data) {
                console.log(data);
                expect(data.total).to.be.equal(1);
                expect(data.processCount[0].count.total).to.be.equal(1);
                expect(data.processCount[0].id).to.be.equal(stats.id);
                done();
            });
        });
    });

    it('packetDrop test', function (done) {
        var i = 0;
        pushClient.on('push', function () {
            expect(i++).to.lessThan(3);
            if (i != 3) {
                push();
            } else {
                stats.packetDropThreshold = 1;
                push();
                push();
                push();
                setTimeout(function () {
                    done();
                }, 50);
            }

        });

        push();

    });

    it('find', function (done) {
        stats.find("toClientPacket", function (data) {
            expect(data.totalCount).to.greaterThan(0);
            done();
        });
    });

    it('find', function (done) {
        stats.getQueryDataKeys(function (data) {
            expect(data).to.contain("toClientPacket");
            done();
        });
    });

    it('StatsTestCase', function (done) {
        pushClient.socket.emit('stats', {
            requestStats: [{
                path: 'StatsTestCase',
                timestamp: Date.now(),
                totalCount: 100,
                successCount: 50,
                totalLatency: 100
            }]
        });
        setTimeout(function () {
            stats.writeStatsToRedis();
            stats.find("request#StatsTestCase", function (data) {
                expect(data.totalCount).to.be.at.least(100);
                expect(data.avgLatency).to.be.at.least(2);
                done();
            });
        }, 500);
    });

});

function push() {
    request
        .post(apiUrl + '/api/push')
        .send({
            pushId: pushClient.pushId,
            json: "wwww"
        })
        .set('Accept', 'application/json')
        .end(function (err, res) {
            expect(res.text).to.be.equal('{"code":"success"}');
        });
}
