var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');
var randomstring = require("randomstring");

describe('arrivalStatsTest', () => {

  before(() => {
    global.proxyServer = defSetting.getDefaultProxyServer();
    global.apiServer = defSetting.getDefaultApiServer();
    global.apiUrl = defSetting.getDefaultApiUrl();
    global.arrivalStats = apiServer.arrivalStats;
    global.topicOnline = arrivalStats.topicOnline;
  });

  after(() => {
    global.proxyServer.close();
    global.apiServer.close();
  });

  it('arrivalRate test', (done) => {
    const packetId = randomstring.generate(12);
    let packet = {
      id: packetId,
      android: {
        title: 'test msg',
        message: 'content of test msg'
      }
    };
    let topicOnlineData = {
      'noti': {
        length: 99
      }
    };
    topicOnline.writeTopicOnline(topicOnlineData);
    arrivalStats.addPushAll(packet, 1000);
    setTimeout(() => {
      arrivalStats.addArrivalInfo(packetId, {
        arrive_android: 98
      });
      arrivalStats.addArrivalInfo(packetId, {
        target_android: 1
      });
      arrivalStats.addArrivalInfo(packetId, {
        arrive_android: 1
      });
    }, 500);
    setTimeout(() => {
      arrivalStats.getRateStatusByType('pushAll', (stats) => {
        let item;
        for (const stat of stats) {
          if (stat.id == packetId) {
            item = stat;
          }
        }
        console.log(item);
        expect(item.id).to.be.equal(packetId);
        expect(item.android.target).to.be.equal(100);
        expect(item.android.arrive).to.be.equal(99);
        done();
      })
    }, 1000);
  })

});
