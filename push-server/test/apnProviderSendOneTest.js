var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('apn send one', function() {

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
    pushClient.on('connect', function() {
      pushClient.socket.emit("token", {
        apnToken: "eeee",
        bundleId: "com.xuduo.pushtest",
        type: "apn"
      });
      pushClient2.socket.emit("token", {
        apnToken: "<ee xxe e>",
        bundleId: "com.xuduo.pushtest2",
        type: "apn"
      });

      var data = {
        "apn": {
          alert: "wwww"
        }
      };
      var str = JSON.stringify(data);

      pushClient.on('noti', function() {
        expect("do not receive").to.be.false
      });
      request({
        url: apiUrl + '/api/notification',
        method: "post",
        headers: {
          'Accept': 'application/json'
        },
        form: {
          pushId: [pushClient.pushId],
          notification: str
        }
      }, (error, response, body) => {
        const result = JSON.parse(body);
        expect(result.code).to.be.equal("success");
        global.apiServer.deviceService.getDeviceByPushId(pushClient2.pushId, (device) => {
          console.log('======pushId=====' + pushClient2.pushId + ' data: ' + device);
          expect(device.token).to.be.equal("eexxee");
          done();
        });
        setTimeout(() => {
          global.apiServer.deviceService.getDeviceByPushId(pushClient.pushId, (device) => {
            expect(device.token).to.be.undefined;
          });
        }, 4000);

      });
    });

  });


});
