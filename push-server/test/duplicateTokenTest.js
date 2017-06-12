var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');
const randomstring = require("randomstring");

describe('set token test', function() {

  before(function() {
    global.proxyServer = defSetting.getDefaultProxyServer();
    global.apiServer = defSetting.getDefaultApiServer();
    global.apiUrl = defSetting.getDefaultApiUrl();
    global.pushClient1 = defSetting.getDefaultPushClient(
      randomstring.generate(12), 'ioS'
    );
    global.pushClient2 = defSetting.getDefaultPushClient(
      randomstring.generate(12), 'ioS'
    );
  });

  after(function() {
    global.proxyServer.close();
    global.apiServer.close();
    global.pushClient1.disconnect();
    global.pushClient2.disconnect();
  });

  it('dulicateToken', function(done) {
    pushClient1.on('connect', function(data) {
      pushClient1.socket.emit("token", {
        token: "testToken",
        type: "testType",
        package_name: "testName"
      });
    });
    pushClient2.on('connect', function(data) {
      setTimeout(() => {
        pushClient2.socket.emit("token", {
          token: "testToken",
          type: "testType",
          package_name: "testName"
        });
        setTimeout(() => {
          apiServer.deviceService.getDeviceByPushId(pushClient1.pushId, (device) => {
            expect(device._id).to.not.exist;
            apiServer.deviceService.getDeviceByPushId(pushClient2.pushId, (device2) => {
              expect(device2.token).to.be.equal('testToken');
              done();
            });
          });
        }, 200);
      }, 200);
    });
  });

});
