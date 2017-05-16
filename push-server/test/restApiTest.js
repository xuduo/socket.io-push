let request = require('request');
let chai = require('chai');
let expect = chai.expect;
let defSetting = require('./defaultSetting');

describe('rest api test', () => {
  before(() => {
    global.apiServer = defSetting.getDefaultApiServer();
    global.apiUrl = defSetting.getDefaultApiUrl();
    global.redis = apiServer.io.redis;
  });
  after(() => {
    apiServer.close();
  });

  it('stat base', (done) => {
    request({
      url: apiUrl + '/api/stats/base',
      method: "get",
    }, (error, response, body) => {
      let ret = JSON.parse(body);
      expect(ret.packetAverage10s).to.be.exist;
      expect(ret.packetDrop).to.be.exist;
      expect(ret.processCount).to.be.exist;
      done();
    });
  });

  // it('heapdump', (done) => {
  //    request({
  //        url: apiUrl + '/api/heapdump',
  //        method: "post",
  //    }, (error, response, body) => {
  //        console.log(body);
  //         let ret = JSON.parse(body);
  //        expect(ret.code).to.be.equal('success');
  //        expect(ret.file).to.be.exist();
  //        expect(file(ret.file)).to.exist();
  //        done();
  //    });
  // });

  it('stat chart', (done) => {
    request({
      url: apiUrl + '/api/stats/chart',
      method: 'get',
      form: {
        key: 'whatever'
      }
    }, (error, response, body) => {
      let ret = JSON.parse(body);
      expect(ret.totalCount).to.be.equal(0);
      expect(ret.totalSuccess).to.be.equal(0);
      done();
    })
  });

  it('stat arrival rate', (done) => {
    request({
      url: apiUrl + '/api/stats/arrival/pushall',
      method: 'get',
    }, (error, response, body) => {
      let ret = JSON.parse(body);
      expect(ret).to.be.array;
      done();
    })
  });

  it('stat query data keys', (done) => {
    request({
      url: apiUrl + '/api/stats/getQueryDataKeys',
      method: 'get'
    }, (error, response, body) => {
      let ret = JSON.parse(body);
      expect(ret.result).to.be.array;
      done();
    })
  });

  it('config', (done) => {
    request({
      url: apiUrl + '/api/config',
      method: 'get'
    }, (error, response, body) => {
      expect(body).to.equal(JSON.stringify(require('../config-api')));
      done();
    })
  })
});
