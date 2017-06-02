var chai = require('chai');
var request = require('request');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('tag', function() {

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

  it('setTags', function(done) {
    pushClient.on("connect", function() {
      pushClient.setTags(["tag1", "tag3"]);
      setTimeout(function() {
        global.apiServer.deviceService.getTagsByPushId(pushClient.pushId, function(tags) {
          expect(tags).to.have.members(["tag1", "tag3"]);
          global.apiServer.deviceService.getPushIdsByTag("tag1", function(pushIds) {
            expect(pushIds).to.deep.include.members([pushClient.pushId]);
            done();
          });
        });
      }, 100);
    });
  });

});
