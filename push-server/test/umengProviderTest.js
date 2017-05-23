const defSetting = require('./defaultSetting');
const randomstring = require('randomstring');

describe('umengProviderTest', function() {

  before(function() {
    global.apiServer = defSetting.getDefaultApiServer();
    global.apiUrl = defSetting.getDefaultApiUrl();
    global.umengProvider = apiServer.umengProvider;
  });

  after(function() {
    global.apiServer.close();
  });

  it('sendAll', function(done) {
    var notificationAll = {
      id: randomstring.generate(12),
      android: {
        title: "sendAll",
        message: "sendAll Msg"
      },
      payload: {
        test: "wwwwqqq"
      }
    };
    var timeToLive = 10000;
    umengProvider.sendAll(notificationAll, timeToLive, function() {
      done();
    });
  });

  it('sendMany', function(done) {
    var notificationOne = {
      id: randomstring.generate(12),
      android: {
        title: "sendOne",
        message: "sendOne Msg"
      },
      payload: {
        test: "wwwwqqq"
      }
    };
    umengProvider.sendMany(notificationOne, [{
      token: "AgDbBHsFqu5Me_ULpi8PJ71QY3KmiV3ZTKAeU4GbKZUL"
    }, {
      token: "AgDbBHsFqu5Me_ULpi8PJ71QY3KmiV3ZTKAeU4GbKZUL"
    }], 60 * 60 * 1000, function() {
      done();
    });
  });

});
