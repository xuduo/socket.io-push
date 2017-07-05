var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('push test', () => {

  before(() => {
    global.proxyServer = defSetting.getDefaultProxyServer();
    global.pushClient = defSetting.getDefaultPushClient();
    global.apiServer = defSetting.getDefaultApiServer();
    global.apiUrl = defSetting.getDefaultApiUrl();
  });

  after(() => {
    global.proxyServer.close();
    global.apiServer.close();
    global.pushClient.disconnect();
  });

  it('connect', (done) => {
    pushClient.on('connect', (data) => {
      expect(data.uid).to.be.undefined;
      done();
    });
  });

  it('bind uid', (done) => {
    pushClient.bindUid({
      uid: "1234"
    });
    setTimeout(() => {
      pushClient.on('connect', (data) => {
        expect(data.uid).to.be.equal("1234");
        done();
      });
      pushClient.disconnect();
      pushClient.connect();
    }, 200);
  });

  it('bind other uid', (done) => {
    pushClient.bindUid({
      uid: "4321"
    });
    setTimeout(() => {
      pushClient.on('connect', (data) => {
        expect(data.uid).to.be.equal("4321");
        done();
      });
      pushClient.disconnect();
      pushClient.connect();
    }, 200);
  });

  it('expect receive push once', (done) => {

    pushClient.bindUid({
      uid: "123456"
    });
    pushClient.bindUid({
      uid: "1234567"
    });
    let rec = 0;
    pushClient.on('push', function(data) {
      expect(data.message).to.be.equal('ok');
      expect(++rec).to.be.equal(1);
      setTimeout(() => {
        done();
      }, 100);
    });


    request({
      url: apiUrl + '/api/push',
      method: "post",
      form: {
        uid: '[1234, 4321,123456,1234567]',
        json: '{"message":"ok"}'
      }
    }, (error, response, body) => {
      console.log(body);
      expect(JSON.parse(body).code).to.be.equal("success");
    });

  });

  it('unbind from client', (done) => {
    pushClient.on('push', function(data) {
      expect('do not receive').to.be.equal('ok');
    });
    pushClient.unbindUid();
    setTimeout(() => {
      request({
        url: apiUrl + '/api/push',
        method: "post",
        form: {
          uid: '["1234", "4321"]',
          json: '{"message":"ok"}'
        }
      }, (error, response, body) => {
        console.log(body);
        expect(JSON.parse(body).code).to.be.equal("success");
      });

      setTimeout(() => {
        pushClient.disconnect();
        pushClient.connect();
        pushClient.on('connect', (data) => {
          expect(data.uid).to.be.undefined;
          pushClient.connect();
          done();
        });
      }, 100);
    }, 100);

  });


});
