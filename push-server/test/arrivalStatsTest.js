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
        arrivalStats.redis.del('stats#packetlist#testTopic');
    });

    after(() => {
        global.proxyServer.close();
        global.apiServer.close();
    });

    it('arrivalRate test', (done) => {
        const topic = 'testTopic';
        const packetId = '42';
        let packet = {
            id: packetId,
            android: {
                title: 'test msg',
                message: 'content of test msg'
            }
        };
        let topicOnlineData = {testTopic: {length: 99}};
        topicOnline.writeTopicOnline(topicOnlineData);
        arrivalStats.startToStats(topic, packet, 1000);
        setTimeout(()=> {
            arrivalStats.addArrivalInfo(packetId, 'arrive', 98);
            arrivalStats.addArrivalInfo(packetId, 'target', 1);
            arrivalStats.addArrivalInfo(packetId, 'arrive', 1);
            arrivalStats.addArrivalInfo('errorPacket', 1);
        }, 500);
        setTimeout(()=> {
            arrivalStats.getRateStatusByTopic(topic, (stats) => {
                const item = stats[0];
                console.log(item);
                expect(item.id).to.be.equal(packetId);
                expect(item.title).to.be.equal(packet.android.title);
                expect(item.message).to.be.equal(packet.android.message);
                expect(item.target).to.be.equal('100');
                expect(item.arrive).to.be.equal('99');
                done();
            })
        }, 1000);
    })

});
