var chai = require('chai');
var request = require('request');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('arrivalStatsTest', () => {

    before(() => {
        global.proxyServer = defSetting.getDefaultProxyServer();
        global.apiServer = defSetting.getDefaultApiServer();
        global.apiUrl = defSetting.getDefaultApiUrl();
        global.arrivalStats = proxyServer.arrivalStats;

        arrivalStats.redisIncrBuffer.commitThreshold = 0;
    });

    after(() => {
        global.proxyServer.close();
        global.apiServer.close();
    });

    it('connect test', (done) => {
        arrivalStats.redis.del("test-online");
        let socket = {platform: 'android', pushId: 'thisisatestpushId1'};
        socket.topics = ['test'];
        arrivalStats.addOnline("test", socket);
        let now = Date.now();
        arrivalStats.getUserOnlineCount('test', now - 1000 * 10, now + 1000 * 10, (count) => {
            expect(count).to.equal(1);
            arrivalStats.addOffline('test', socket);
            setTimeout(() => {
                arrivalStats.getUserOnlineCount('test', now + 1000 * 3, now + 1000 * 10, (cnt) => {
                    expect(cnt).to.equal(0);
                    done();
                });
            }, 1000)
        })
    });

    it('arrival test', (done) => {
        arrivalStats.redis.del("test-online");
        arrivalStats.redis.del("stats#arrivalStats");
        let socket = {platform: 'android', pushId: 'thisisatestpushId'};
        socket.topics = ['test'];
        arrivalStats.addOnline('test', socket);
        let now = Date.now();
        let packet = {id:123456543, android:{title:'title', message:'message'}, timestampValid: now + 5000};
        arrivalStats.redis.del("stats#arrival#"+packet.id, () => {
            arrivalStats.addPacketToArrivalRate('test', packet, now + 3000, 5000);
            arrivalStats.addArrivalSuccess(packet.id, 1);
            setTimeout(() => {
                arrivalStats.getArrivalRateStatus((stats) => {
                    expect(stats[0]).to.be.ok;
                    expect(stats[0].reachCount).to.equal('1');
                    expect(stats[0].targetBefore).to.equal(1);
                    done();
                });
            }, 1000);
        });

    })

});
