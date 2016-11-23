let request = require('request');
let chai = require('chai');
let expect = chai.expect;
let defSetting = require('./defaultSetting');

describe("threshold test", () => {
    before(() => {
        let thresholdConfig = {'test': 1};
        global.apiServer = defSetting.getDefaultApiServer();
        global.apiThreshold = require('../lib/api/apiThreshold')(apiServer.io.redis, thresholdConfig);
    });

    after(() => {
        apiServer.close();
    });

    it('check drop', (done) => {
        apiThreshold.checkPushDrop('test', (call) => {
            expect(call).to.equal(true);
            apiThreshold.checkPushDrop('test', (call2) => {
                expect(call2).to.equal(false);
                done();
            });
        });
    });

    it('del check', (done) => {
        apiThreshold.setThreshold('test', 0);
        apiThreshold.checkPushDrop('test', (call) => {
            expect(call).to.equal(true);
            done();
        })
    });

});