var chai = require('chai');
var request = require('request');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('statsTest', function () {

    before(function () {
        global.proxyServer = defSetting.getDefaultProxyServer();
        global.apiServer = defSetting.getDefaultApiServer();
        global.apiUrl = defSetting.getDefaultApiUrl();
        global.stats = proxyServer.stats;
        stats.redis.del("stats#sessionCount");

        stats.redisIncrBuffer.commitThreshold = 0;
        global.pushClient = defSetting.getDefaultPushClient();
    });

    after(function () {
        global.proxyServer.close();
        global.apiServer.close();
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

    request({
        url: apiUrl + '/api/push',
        method: "post",
        form: {
            pushId: pushClient.pushId,
            json: "wwww"
        }
    }, (error, response, body) => {
        expect(JSON.parse(body).code).to.be.equal("success");
    });

}
