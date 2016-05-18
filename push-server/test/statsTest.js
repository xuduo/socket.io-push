var chai = require('chai');
var request = require('superagent');
var expect = chai.expect;

describe('unsubscribe test', function () {

    before(function () {
        var config = require('../config.js');
        global.pushService = require('../lib/push-server.js')(config);
        global.apiUrl = 'http://localhost:' + config.api_port;
        global.pushClient = require('../lib/client/push-client.js')('http://localhost:' + config.io_port);
    });

    after(function () {
        global.pushService.close();
        global.pushClient.disconnect();
    });

    it('sessionCount test', function (done) {
        pushService.stats.redisIncrBuffer.commitThreshold = 0;
        pushClient.on('connect', function () {
            pushService.stats.writeStatsToRedis();
            pushService.stats.getSessionCount(function (data) {
                console.log(data);
                expect(data.sessionCount).to.be.equal(1);
                expect(data.processCount[0].count.total).to.be.equal(1);
                expect(data.processCount[0].id).to.be.equal(pushService.stats.id);
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
                pushService.stats.packetDropThreshold = 1;
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
        pushService.stats.find("toClientPacket", function (data) {
            expect(data.totalCount).to.greaterThan(0);
            done();
        });
    });

    it('find', function (done) {
        pushService.stats.getQueryDataKeys(function (data) {
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
        setInterval(function () {
            pushService.stats.writeStatsToRedis();
            pushService.stats.find("request#StatsTestCase", function (data) {
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
