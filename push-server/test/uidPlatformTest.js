var request = require('superagent');
var config = require('../config.js');

var chai = require('chai');

var expect = chai.expect;

describe('push test', function () {

    before(function () {
        var config = require('../config.js');
        global.apiService = require('../lib/push-server.js')(config);
        global.apiUrl = 'http://localhost:' + config.api_port;

    });

    after(function () {
        global.apiService.close();
    });

    it('bind uid', function (done) {
        apiService.uidStore.bindUid("a", "100", 1000000, "ios", "true");
        console.log(1);
        setTimeout(function(){
            apiService.uidStore.bindUid("b", "100", 1000000, "ios", "true");
            console.log(2);
            setTimeout(function () {
                apiService.uidStore.getPushIdByUid("100", function (pushIds) {
                    console.log(3);
                    expect(pushIds).to.be.deep.equal(["b"]);
                    apiService.uidStore.bindUid("c", "100", 1000000, "ios", false);
                    setTimeout(function () {
                        apiService.uidStore.getPushIdByUid("100", function (pushIds) {
                            expect(pushIds).to.be.deep.equal(["b", "c"]);
                            done();
                        });
                    }, 100);
                }, 100);
            },100);
        },100);




    });

});
