var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('notification', function() {

  before(function() {
    global.proxyServer = defSetting.getDefaultProxyServer();
    global.apiServer = defSetting.getDefaultApiServer();
    global.apiUrl = defSetting.getDefaultApiUrl();
    global.apnProxy = defSetting.getDefaultApnProxyServer();
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

  it('connect', function(done) {
    pushClient.on('connect', function(data) {
      pushClient.setTags(['version_2.3.1', 'test']);
      done();
    });
  });

  it('bind uid', function(done) {
    request({
      url: apiUrl + '/api/uid/bind',
      method: "post",
      form: {
        pushId: pushClient.pushId,
        uid: 1
      }
    }, (error, response, body) => {
      expect(JSON.parse(body).code).to.be.equal("success");
      done();
    });
  });


  it('tagGreaterThan do not receive', function(done) {
    var title = 'hello',
      message = 'hello world';
    var data = {
      "android": {
        "title": title,
        "message": message
      }
    }
    var str = JSON.stringify(data);

    var notificationCallback = function(data) {
      expect('do').to.be.equal('not receive');
    }


    pushClient.on('notification', notificationCallback);

    request({
      url: apiUrl + '/api/notification',
      method: "post",
      form: {
        pushId: pushClient.pushId,
        notification: str,
        tagStart: 'version_',
        tagGreaterThan: '2.5'
      }
    }, (error, response, body) => {
      console.log('notification to pushId ', pushClient.pushId);
      expect(JSON.parse(body).code).to.be.equal("success");
      setTimeout(() => {
        done();
      }, 500);
    });

  });

  it('tagGreaterThan', function(done) {
    var title = 'hello',
      message = 'hello world';
    var data = {
      "android": {
        "title": title,
        "message": message
      }
    }
    var str = JSON.stringify(data);

    var notificationCallback = function(data) {
      expect(data.title).to.be.equal(title);
      expect(data.message).to.be.equal(message);
      done();
    }

    pushClient.on('notification', notificationCallback);

    request({
      url: apiUrl + '/api/notification',
      method: "post",
      form: {
        pushId: pushClient.pushId,
        notification: str,
        tagStart: 'version_',
        tagGreaterThan: '2.3'
      }
    }, (error, response, body) => {
      console.log('notification to pushId ', pushClient.pushId);
      expect(JSON.parse(body).code).to.be.equal("success");
    });

  });

  it('tagLessThan', function(done) {
    var title = 'hello',
      message = 'hello world';
    var data = {
      "android": {
        "title": title,
        "message": message
      }
    }
    var str = JSON.stringify(data);

    var notificationCallback = function(data) {
      expect(data.title).to.be.equal(title);
      expect(data.message).to.be.equal(message);
      done();
    }

    pushClient.on('notification', notificationCallback);

    request({
      url: apiUrl + '/api/notification',
      method: "post",
      form: {
        pushId: pushClient.pushId,
        notification: str,
        tagStart: 'version_',
        tagLessThan: '2.5'
      }
    }, (error, response, body) => {
      console.log('notification to pushId ', pushClient.pushId);
      expect(JSON.parse(body).code).to.be.equal("success");
    });

  });

  it('tagLessThan do not receive', function(done) {
    var title = 'hello',
      message = 'hello world';
    var data = {
      "android": {
        "title": title,
        "message": message
      }
    }
    var str = JSON.stringify(data);

    var notificationCallback = function(data) {
      expect('do').to.be.equal('not receive');
    }
    pushClient.on('notification', notificationCallback);

    request({
      url: apiUrl + '/api/notification',
      method: "post",
      form: {
        pushId: pushClient.pushId,
        notification: str,
        tagStart: 'version_',
        tagLessThan: '2.1'
      }
    }, (error, response, body) => {
      console.log('notification to pushId ', pushClient.pushId);
      expect(JSON.parse(body).code).to.be.equal("success");
      setTimeout(() => {
        done();
      }, 500);
    });

  });

  it('tagCross', function(done) {
    var title = 'hello',
      message = 'hello world';
    var data = {
      "android": {
        "title": title,
        "message": message
      }
    }
    var str = JSON.stringify(data);

    var notificationCallback = function(data) {
      expect(data.title).to.be.equal(title);
      expect(data.message).to.be.equal(message);
      done();
    }

    pushClient.on('notification', notificationCallback);

    request({
      url: apiUrl + '/api/notification',
      method: "post",
      form: {
        pushId: pushClient.pushId,
        notification: str,
        tagStart: 'version_',
        tagLessThan: '2.5',
        tagGreaterThan: '2.3'
      }
    }, (error, response, body) => {
      console.log('notification to pushId ', pushClient.pushId);
      expect(JSON.parse(body).code).to.be.equal("success");
    });

  });


});
