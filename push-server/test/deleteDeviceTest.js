var chai = require('chai');
var request = require('request');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('deleteDevice', function() {

  before(function() {
    global.proxyServer = defSetting.getDefaultProxyServer();
    global.apiServer = defSetting.getDefaultApiServer();
    global.apiUrl = defSetting.getDefaultApiUrl();
    global.pushClient = defSetting.getDefaultPushClient();
  });

  after(function() {
    global.proxyServer.close();
    global.apiServer.close();
    global.pushClient.disconnect();
  });

  it('deleteDevice', function(done) {
    pushClient.on("connect", function() {

      setTimeout(() => {
        apiServer.deviceService.getDeviceByPushId(pushClient.pushId, (data) => {
          expect(data._id).to.be.equal(pushClient.pushId);
          apiServer.deviceService.deleteByPushId(pushClient.pushId);
          setTimeout(() => {
            apiServer.deviceService.getDeviceByPushId(pushClient.pushId, (data) => {
              expect(data._id).to.be.undefined;
              done();
            });
          }, 200);
        })
      }, 100);

    });
  });


});