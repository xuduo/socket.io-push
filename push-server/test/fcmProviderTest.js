var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('fcmProviderTest', function() {

  before(function() {
    global.proxyServer = defSetting.getDefaultProxyServer();
    global.apiServer = defSetting.getDefaultApiServer();
    global.apnProxy = defSetting.getDefaultApnProxyServer();
    global.apiUrl = defSetting.getDefaultApiUrl();
    global.pushClient = defSetting.getDefaultPushClient();
    global.pushClient2 = defSetting.getDefaultPushClient();
  });

  after(function() {
    global.proxyServer.close();
    global.apiServer.close();
    global.apnProxy.close();
    global.pushClient.disconnect();
    global.pushClient2.disconnect();
  });

  it('test send one', function(done) {
    pushClient2.on('connect', function() {
      pushClient2.socket.emit("token", {
        apnToken: "d6iIZtcmmZ4:APA91bFlmVFGrJWyrayinMz_p5jXeU08YgKrrOMhDKm5QkuKimuJdp9aTl2_CdYlsfTfgl6fc2ovbWnbxT1c8mKhURidf5EvquBUfBAFEfv7Io9znYu4-qjJfzWqWPIN3OZvGmrVtrOd",
        bundleId: "wwww",
        type: "fcm"
      });
    });

    pushClient.on('connect', function() {
      pushClient.socket.emit("token", {
        apnToken: "d6iIZtcmmZ4:APA91bFlmVFGrJWyrayinMF_p5jXeU08YgKrrOMhDKm5QkuKimuJdp9aTl2_CdYlsfTfgl6fc2ovbWnbxT1c8mKhURidf5EvquBUfBAFEfv7Io9znYu4-qjJfzWqWPIN3OZvGmrVtrOd",
        bundleId: "wwww",
        type: "fcm"
      });

      var data = {
        android: {
          title: "send one",
          message: "send one Msg"
        },
        payload: {
          test: "wwwwqqq"
        }
      };
      var str = JSON.stringify(data);

      pushClient.on('noti', function() {
        expect("do not receive").to.be.false
      });

      setTimeout(() => {
        request({
          url: apiUrl + '/api/notification',
          method: "post",
          headers: {
            'Accept': 'application/json'
          },
          form: {
            pushId: [pushClient.pushId, pushClient2.pushId],
            notification: str
          }
        }, (error, response, body) => {
          const result = JSON.parse(body);
          expect(result.code).to.be.equal("success");
          setTimeout(() => {
            done();
          }, 1500);
        });
      });
    }, 300);


  });


  it('test send all', function(done) {

    var data = {
      android: {
        title: "send all",
        message: "send all message"
      },
      payload: {
        test: "wwwwqqq"
      }
    };
    var str = JSON.stringify(data);

    request({
      url: apiUrl + '/api/notification',
      method: "post",
      headers: {
        'Accept': 'application/json'
      },
      form: {
        pushAll: true,
        notification: str
      }
    }, (error, response, body) => {
      const result = JSON.parse(body);
      expect(result.code).to.be.equal("success");
      setTimeout(() => {
        done();
      }, 1500);
    });

  });


});