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
        // arrivalStats.redis.del("connInfo"); //bug

        arrivalStats.redisIncrBuffer.commitThreshold = 0;
        // global.pushClient = defSetting.getAndroidPushClient();
    });

    after(() => {
        global.proxyServer.close();
        global.apiServer.close();
        // global.pushClient.disconnect();
    });

    // it('online count test', (done) => {
    //     pushClient.on('connect', () => {
    //         setTimeout(()=>{
    //             arrivalStats.getUserOnlineCount(Date.now() - 1000 * 100, Date.now() + 1000 * 100, (count) => {
    //                 expect(count).to.equal(1);
    //                 done();
    //             });
    //         }, 1000);
    //     });
    // });

    it('connect test', (done) => {
        arrivalStats.redis.del("connInfo");
        let socket = {platform: 'android', pushId: 'thisisatestpushId1'};
        arrivalStats.connect(socket);
        let now = Date.now();
        arrivalStats.getUserOnlineCount(now - 1000 * 10, now + 1000 * 10, (count) => {
            expect(count).to.equal(1);
            arrivalStats.disconnect(socket);
            setTimeout(() => {
                arrivalStats.getUserOnlineCount(now + 1000 * 3, now + 1000 * 10, (cnt) => {
                    expect(cnt).to.equal(0);
                    done();
                });
            }, 1000)
        })
    });

    it('arrival test', (done) => {
        arrivalStats.redis.del("connInfo");
        arrivalStats.redis.del("stats#arrivalStats");
        let socket = {platform: 'android', pushId: 'thisisatestpushId'};
        arrivalStats.connect(socket);
        let now = Date.now();
        let packet = {id:123456543, android:{title:'title', message:'message'}, timestampValid: now + 5000};
        arrivalStats.redis.del("stats#arrival#"+packet.id, () => {
            arrivalStats.addPacketToArrivalRate(packet, now + 3000, 5000);
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

let noti = () => {
    var title = 'hello',
        message = 'hello world';
    var data = {
        android: {"title": title, "message": message},
        payload: {"ppp": 123}
    };
    var str = JSON.stringify(data);
    request({
        url: apiUrl + '/api/notification',
        method: "post",
        form: {
            pushId: '',
            pushAll: 'true',
            notification: str
        }
    }, (error, response, body) => {
        expect(JSON.parse(body).code).to.be.equal("success");
    });
}
