var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('arrivalStatsTest', () => {

    before(() => {
        global.proxyServer = defSetting.getDefaultProxyServer();
        global.apiServer = defSetting.getDefaultApiServer();
        global.apiUrl = defSetting.getDefaultApiUrl();
        global.arrivalStats = proxyServer.arrivalStats;
        global.topicOnline = arrivalStats.topicOnline;
        arrivalStats.redis.del('stats#packetlist#noti');
    });

    after(() => {
        global.proxyServer.close();
        global.apiServer.close();
    });

    it('arrivalRate test', (done) => {
        const packetId = '42';
        let packet = {
            id: packetId,
            android: {
                title: 'test msg',
                message: 'content of test msg'
            }
        };
        let topicOnlineData = {'noti': {length: 99}};
        topicOnline.writeTopicOnline(topicOnlineData);
        arrivalStats.addPushAll(packet, 1000);
        setTimeout(()=> {
            arrivalStats.addArrivalInfo(packetId, 'arrive_android', 98);
            arrivalStats.addArrivalInfo(packetId, 'target_android', 1);
            arrivalStats.addArrivalInfo(packetId, 'arrive_android', 1);
            arrivalStats.addArrivalInfo('errorPacket', 1);
        }, 500);
        setTimeout(()=> {
            arrivalStats.getRateStatusByType('noti', (stats) => {
                const item = stats[0];
                console.log(item);
                expect(item.id).to.be.equal(packetId);
                expect(item.target_android).to.be.equal('100');
                expect(item.arrive_android).to.be.equal('99');
                done();
            })
        }, 1000);
    })

});
