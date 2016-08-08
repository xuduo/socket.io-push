var async = require('async');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('push test', function () {

    before(function () {
        global.pushService = defSetting.getDefaultPushService();
        global.apiUrl = defSetting.getDefaultApiUrl();
        global.apiService = global.pushService.api;

    });

    after(function () {
        global.pushService.close();
    });

    function delayCallback(callback) {
        setTimeout(()=> {
            callback(null, null);
        }, 100);
    }

    it('bind uid', function (done) {
        async.series({
            "bind uid to a": (callback) => {
                apiService.uidStore.bindUid("a", "100", 1000000, "ios", 1);
                delayCallback(callback);
            },
            "bind uid to b": (callback) => {
                apiService.uidStore.bindUid("b", "100", 1000000, "ios", 1);
                delayCallback(callback);
            },
            "test uid bind result - test1": (callback) => {
                apiService.uidStore.getPushIdByUid("100", function (pushIds) {
                    expect(pushIds).to.be.deep.equal(["b"]);
                    apiService.uidStore.bindUid("c", "100", 1000000, "ios", 2);
                    delayCallback(callback);
                });
            },
            "test uid bind result - test2": (callback) => {
                apiService.uidStore.getPushIdByUid("100", function (pushIds) {
                    expect(pushIds).to.be.deep.equal(["b", "c"]);
                    apiService.uidStore.bindUid("d", "100", 1000000, "ios", 2);
                    delayCallback(callback);
                });
            },
            "test uid bind result - test3": (callback) => {
                apiService.uidStore.getPushIdByUid("100", function (pushIds) {
                    expect(pushIds).to.be.deep.equal(["c", "d"]);
                    apiService.uidStore.bindUid("e", "100", 1000000, "ios", 4);
                    delayCallback(callback);
                });
            },
            "test uid bind result - test4": (callback) => {
                apiService.uidStore.getPushIdByUid("100", function (pushIds) {
                    expect(pushIds).to.be.deep.equal(["c", "d", "e"]);
                    delayCallback(callback);
                });
            }
        }, ()=> {
            done();
        });
    });


    it('unbind uid', function (done) {
        async.series({
            'remove uid': (callback) => {
                apiService.uidStore.removeUid("1000");
                delayCallback(callback);
            },
            'bind uid to a ': (callback) => {
                apiService.uidStore.bindUid("a", "1000", 0, "ios", 0);
                delayCallback(callback);
            },
            'bind uid to b': (callback) => {
                apiService.uidStore.bindUid("b", "1000", 0, "ios", 0);
                delayCallback(callback);
            },
            'test uid bind result': (callback) => {
                apiService.uidStore.getPushIdByUid("1000", function (pushIds) {
                    expect(pushIds).to.be.deep.equal(["a", "b"]);
                    delayCallback(callback);
                });
            },
            "remove uid ": (callback) => {
                apiService.uidStore.removeUid("1000");
                delayCallback(callback);
            },
            "test uid bind result  ": (callback) => {
                apiService.uidStore.getPushIdByUid("1000", function (pushIds) {
                    expect(pushIds).to.be.empty;
                    apiService.uidStore.getUidByPushId("a", function (uid) {
                        expect(uid).to.be.null;
                        delayCallback(callback);
                    });
                });
            }
        }, ()=> {
            done();
        });
    });

});
