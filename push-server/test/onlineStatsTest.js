var async = require('async');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('push test', function () {

    before(function () {
        global.apiServer = defSetting.getDefaultApiServer();
    });

    after(function () {
        global.apiServer.close();
    });


    it('write', function (done) {
        apiServer.onlineStats.write(10000, done);
    });

});
