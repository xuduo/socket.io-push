var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var defSetting = require('./defaultSetting');

describe('push test', () => {

    before(() => {
        global.proxyServer = defSetting.getDefaultProxyServer();
        global.pushClient = defSetting.getDefaultPushClient();
    });

    after(() => {
        global.proxyServer.close();
        global.pushClient.disconnect();
    });

    it('connect', (done) => {
        pushClient.on('connect', (data) => {
            expect(data.uid).to.be.undefined;
            done();
        });
    });

    it('bind uid', (done) => {
        pushClient.bindUid({uid: "1234"});
        setTimeout(()=> {
            pushClient.disconnect();
            pushClient.connect();
            pushClient.on('connect', (data) => {
                expect(data.uid).to.be.equal("1234");
                pushClient.connect();
                done();
            });
        }, 200);
    });

    it('unbind from client', (done) => {
        pushClient.unbindUid();
        pushClient.disconnect();
        pushClient.connect();
        pushClient.on('connect', (data) => {
            expect(data.uid).to.be.undefined;
            pushClient.connect();
            done();
        });
    });


});
