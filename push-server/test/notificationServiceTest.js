var config = require('../config.js');
var chai = require('chai');
var expect = chai.expect;

describe('huawei test', function () {

    it('test ttl to single', function (done) {
        var providerFactory = require('../lib/service/notificationProviderFactory.js')();
        var redis = require('../lib/redis/simpleRedisHashCluster.js')(config.redis);
        var notificationService = require('../lib/service/notificationService.js')(providerFactory, redis);
        notificationService.setThirdPartyToken({token: "abc", pushId: "def", type: "huawei"});
        setTimeout(function () {
            notificationService.getTokenDataByPushId("def", function (token) {
                expect(token.token).to.equal("abc");
                done();
            });
        }, 200);

    });

});
