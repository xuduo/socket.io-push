var expect = require('chai').expect;
var defSetting = require('./defaultSetting');

describe('huawei test', function() {

  before(function() {
    global.config = require('../config-api');
    global.apiServer = defSetting.getDefaultApiServer();
    global.apiUrl = defSetting.getDefaultApiUrl();
    global.huaweiProvider = apiServer.huaweiProvider;
  });

  after(function() {
    global.apiServer.close();
  });

  it('huawei send all ', function(done) {
    var notificationAll = {
      id: "qwer",
      android: {
        title: "sendAll",
        message: "sendAll Msg",
        payload: {
          test: "wwwwqqq"
        }
      }
    };
    var timeToLive = 10000;
    var doneCount = 0;
    huaweiProvider.sendAll(notificationAll, timeToLive);
    done();
  });

  it('huawei send one', function(done) {
    var notificationOne = {
      id: "qwer",
      android: {
        title: "sendOne",
        message: "sendOne Msg",
        payload: {
          test: "wwwwqqq"
        }
      }
    };
    huaweiProvider.sendMany(notificationOne, [{
      token: "0988774580439242232000001425000001",
      package_name: "com.yy.misaka.demo2"
    }]);
    done();
  });

  it('huawei send many', function(done) {
    var notificationOne = {
      id: "qwer",
      android: {
        title: "sendOne",
        message: "sendOne Msg",
        payload: {
          test: "wwwwqqq"
        }
      }
    };
    var doneCount = 0;
    huaweiProvider.sendMany(notificationOne, [{
      token: "0355911070660922200000142500CN01"
    }, {
      token: "0355911070660922200000142500CN01"
    }]);
    done();
  });

  it('huawei send many2', function(done) {
    var notificationOne = {
      id: "qwer",
      android: {
        title: "sendOne",
        message: "sendOne Msg",
        payload: {
          test: "wwwwqqq"
        }
      }
    };
    var doneCount = 0;
    huaweiProvider.sendMany(notificationOne, [{
      token: "0988774580439242232000001425000001",
      package_name: "com.yy.misaka.demo2"
    }, {
      token: "0355911070660922200000142500CN01"
    }], 60 * 60 * 1000);
    done();


  });
});
