var chai = require('chai');

var expect = chai.expect;

describe('push test', function () {

    before(function () {
        global.pushService = require('../lib/push-server.js')({             proxy: require("../config-proxy"),             api: require("../config-api")         });
        global.apiUrl = 'http://localhost:' + pushService.api.port;
        global.apiService = global.pushService.api;

    });

    after(function () {
        global.pushService.close();
    });

    it('bind uid', function (done) {
        apiService.uidStore.bindUid("a", "100", 1000000, "ios", 1);
        console.log(1);
        setTimeout(function () {
            apiService.uidStore.bindUid("b", "100", 1000000, "ios", 1);
            console.log(2);
            setTimeout(function () {
                apiService.uidStore.getPushIdByUid("100", function (pushIds) {
                    console.log(3);
                    expect(pushIds).to.be.deep.equal(["b"]);
                    apiService.uidStore.bindUid("c", "100", 1000000, "ios", 2);
                    setTimeout(function () {
                        apiService.uidStore.getPushIdByUid("100", function (pushIds) {
                            expect(pushIds).to.be.deep.equal(["b", "c"]);
                            apiService.uidStore.bindUid("d", "100", 1000000, "ios", 2);
                            setTimeout(function () {
                                apiService.uidStore.getPushIdByUid("100", function (pushIds) {
                                    expect(pushIds).to.be.deep.equal(["c", "d"]);
                                    apiService.uidStore.bindUid("e", "100", 1000000, "ios", 4);
                                    setTimeout(function () {
                                        apiService.uidStore.getPushIdByUid("100", function (pushIds) {
                                            expect(pushIds).to.be.deep.equal(["c", "d", "e"]);
                                            done();
                                        });
                                    }, 100);
                                });
                            }, 100);
                        });
                    }, 100);
                }, 100);
            }, 100);
        }, 100);

    });


    it('unbind uid', function (done) {
        apiService.uidStore.removeUid("1000");
        apiService.uidStore.bindUid("a", "1000", 0, "ios", 0);
        apiService.uidStore.bindUid("b", "1000", 0, "ios", 0);
        setTimeout(function () {
            apiService.uidStore.getPushIdByUid("1000", function (pushIds) {
                expect(pushIds).to.be.deep.equal(["a", "b"]);
                apiService.uidStore.removeUid("1000");
                setTimeout(function () {
                    apiService.uidStore.getPushIdByUid("1000", function (pushIds) {
                        expect(pushIds).to.be.empty;
                        apiService.uidStore.getUidByPushId("a", function (uid) {
                            expect(uid).to.be.null;
                            done();
                        });
                    });
                }, 100);
            });
        }, 100);

    });

});
