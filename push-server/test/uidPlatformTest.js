var async = require('async');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('pushTest', function () {

    before(function () {
        global.proxyServer = defSetting.getDefaultProxyServer();
        global.apiServer = defSetting.getDefaultApiServer();
        global.apiUrl = defSetting.getDefaultApiUrl();
    });

    after(function () {
        global.proxyServer.close();
        global.apiServer.close();
    });

    function delayCallback(callback) {
        setTimeout(()=> {
            callback(null, null);
        }, 200);
    }

    it('bindUid', function (done) {
        async.series({
            "bind uid to a": (callback) => {
                apiServer.uidStore.bindUid("a", "100", "ios", 1);
                delayCallback(callback);
            },
            "bind uid to b": (callback) => {
                apiServer.uidStore.bindUid("b", "100", "ios", 1);
                delayCallback(callback);
            },
            "test uid bind result - test1": (callback) => {
                apiServer.uidStore.getPushIdByUid("100", function (pushIds) {
                    expect(pushIds).to.be.deep.equal(["b"]);
                    apiServer.uidStore.bindUid("c", "100", "ios", 2);
                    delayCallback(callback);
                });
            },
            "test uid bind result - test2": (callback) => {
                apiServer.uidStore.getPushIdByUid("100", function (pushIds) {
                    expect(pushIds).to.be.deep.equal(["b", "c"]);
                    apiServer.uidStore.bindUid("d", "100", "ios", 2);
                    delayCallback(callback);
                });
            },
            "test uid bind result - test3": (callback) => {
                apiServer.uidStore.getPushIdByUid("100", function (pushIds) {
                    expect(pushIds).to.be.deep.equal(["c", "d"]);
                    apiServer.uidStore.bindUid("e", "100", "ios", 4);
                    delayCallback(callback);
                });
            },
            "test uid bind result - test4": (callback) => {
                apiServer.uidStore.getPushIdByUid("100", function (pushIds) {
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
                apiServer.uidStore.removeUid("1000");
                delayCallback(callback);
            },
            'bind uid to a ': (callback) => {
                apiServer.uidStore.bindUid("a", "1000", 0, "ios", 0);
                delayCallback(callback);
            },
            'bind uid to b': (callback) => {
                apiServer.uidStore.bindUid("b", "1000", 0, "ios", 0);
                delayCallback(callback);
            },
            'test uid bind result': (callback) => {
                apiServer.uidStore.getPushIdByUid("1000", function (pushIds) {
                    expect(pushIds).to.be.deep.equal(["a", "b"]);
                    delayCallback(callback);
                });
            },
            "remove uid ": (callback) => {
                apiServer.uidStore.removeUid("1000");
                delayCallback(callback);
            },
            "test uid bind result  ": (callback) => {
                apiServer.uidStore.getPushIdByUid("1000", function (pushIds) {
                    expect(pushIds).to.be.empty;
                    apiServer.uidStore.getUidByPushId("a", function (uid) {
                        expect(uid).to.not.exist;
                        delayCallback(callback);
                    });
                });
            }
        }, ()=> {
            done();
        });
    });

});
