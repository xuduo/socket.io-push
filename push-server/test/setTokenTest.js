var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');
const randomstring = require("randomstring");

describe('set token test', function() {

  before(function() {
    global.proxyServer = defSetting.getDefaultProxyServer();
    global.apiServer = defSetting.getDefaultApiServer();
    global.apiUrl = defSetting.getDefaultApiUrl();
    global.pushClient = defSetting.getDefaultPushClient(
      randomstring.generate(12), 'ioS'
    );
  });

  after(function() {
    global.proxyServer.close();
    global.apiServer.close();
    global.pushClient.disconnect();
  });

  it('set apn no token', function(done) {
    pushClient.on('connect', function(data) {
      console.log('connect ------------- ', data);
      expect(data.pushId).to.be.equal(pushClient.pushId);
      var notificationService = apiServer.notificationService;
      setTimeout(function() {
        notificationService.getTokenDataByPushId(pushClient.pushId, function(token) {
          expect(token.type).to.equal("apnNoToken");
          pushClient.socket.emit("token", {
            token: "testToken",
            type: "testType"
          });
          setTimeout(function() {
            notificationService.getTokenDataByPushId(pushClient.pushId, function(token) {
              expect(token.token).to.equal("testToken");
              expect(token.type).to.equal("testType");
              pushClient.disconnect();
              pushClient.connect();
              pushClient.on('connect', () => {
                setTimeout(() => {
                  notificationService.getTokenDataByPushId(pushClient.pushId, (token) => {
                    expect(token.token).to.equal("testToken");
                    expect(token.type).to.equal("testType");
                    done();
                  });
                }, 100);
              });
            });
          }, 100);
        });
      }, 100);
    });
  });

});
