var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

var title = 'hello',
  message = 'hello world';
var data = {
  "android": {
    "title": title,
    "message": message
  },
  "payload": {
    "wwww": "qqqq"
  }
};
var str = JSON.stringify(data);

describe('apiRouterTest', function() {

  before(function() {
    global.proxyServer = defSetting.getDefaultProxyServer();
    global.apiServer = defSetting.getDefaultApiServer();
    global.apnProxy = defSetting.getDefaultApnProxyServer();
    global.apiServer.apiRouter.batchSize = 3;
    global.apiUrl = defSetting.getDefaultApiUrl();
    global.pushClients = [];
    for (let i = 0; i < 7; i++) {
      global.pushClients.push(defSetting.getDefaultPushClient("abcdefghijsdjfk" + i));
    }
  });

  after(function() {
    global.proxyServer.close();
    global.apiServer.close();
    global.apnProxy.close();
    global.pushClients.forEach((client) => {
      client.disconnect();
    });
  });



  it('send notification exceeds buffer', (done) => {

    global.apiServer.apiRouter.bufferSize = 2;
    let pushIds = [];
    pushClients.forEach((client) => {
      var notificationCallback = function(data) {
        expect('do not receive').to.be.equal('111');
        done();
      };
      client.on('notification', notificationCallback);
      pushIds.push(client.pushId);
      if (pushIds.length == pushClients.length) {
        request({
          url: apiUrl + '/api/notification',
          method: "post",
          headers: {
            'Accept': 'application/json'
          },
          form: {
            pushId: ['123123444'],
            notification: str
          }
        });
        request({
          url: apiUrl + '/api/notification',
          method: "post",
          headers: {
            'Accept': 'application/json'
          },
          form: {
            pushId: ['123123444'],
            notification: str
          }
        });
        request({
          url: apiUrl + '/api/notification',
          method: "post",
          headers: {
            'Accept': 'application/json'
          },
          form: {
            pushId: JSON.stringify(pushIds),
            notification: str
          }
        }, (error, response, body) => {
          expect(JSON.parse(body).code).to.be.equal("success");
          setTimeout(() => {
            done();
          }, 200);
        });
      }
    });

  });


});;
