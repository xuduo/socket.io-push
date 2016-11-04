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
            expect(ret.packetAverage1).to.be.exist;
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
            form: {key: 'whatever'}
        }, (error, response, body) => {
            let ret = JSON.parse(body);
            expect(ret.totalCount).to.be.equal(0);
            expect(ret.totalSuccess).to.be.equal(0);
            done();
        })
    });

    it('stat arrival rate', (done) => {
        request({
            url: apiUrl + '/api/stats/arrivalRate',
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

    it('stat online job', (done) => {
        request({
            url: apiUrl + "/api/stats/onlineJob",
            method: 'post',
            form: {
                interval: 0
            }
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal('success');
            done();
        })
    });

    it('redis get', (done) => {
        redis.set('redistest', 'redistest');
        request({
            url: apiUrl + '/api/redis/get',
            method: 'get',
            form: {key: 'redistest'}
        }, (error, response, body) => {
            let ret = JSON.parse(body);
            expect(ret.key).to.be.equal('redistest');
            expect(ret.value).to.be.equal('redistest');
            done();
        })
    });

    it('redis del', (done) => {
        request({
            url: apiUrl + '/api/redis/del',
            method: 'get',
            form: {key: 'redistest'}
        }, (error, response, body) => {
            expect(JSON.parse(body).code).to.be.equal('success');
            redis.get('redistest', (err, value) => {
                expect(value).to.be.null;
                done();
            })
        })
    });

    it('redis hash', (done) => {
        request({
            url: apiUrl + '/api/redis/hash',
            method: 'get',
            form: {key: 'redisinstance'}
        }, (error, response, body) => {
            let ret = JSON.parse(body);
            let redisconf = require('../config-api').redis.read;
            expect(redisconf).to.contain(ret);
            done();
        })
    });

    it('redis hgetall', (done) => {
        redis.hset('redishashoptest', 'item1', 'value1');
        redis.hset('redishashoptest', 'item2', 'value2');
        request({
            url: apiUrl + '/api/redis/hgetall',
            method: 'get',
            form:{key: 'redishashoptest'}
        }, (error, response, body) => {
            let ret = JSON.parse(body);
            expect(ret.key).to.be.equal('redishashoptest');
            expect(ret.count).to.be.equal(2);
            expect(ret.result['item1']).to.be.equal('value1');
            expect(ret.result['item2']).to.be.equal('value2');
            done();
        })
    });

    it('redis hkeys', (done) => {
        request({
            url: apiUrl + '/api/redis/hkeys',
            method: 'get',
            form: {key: 'redishashoptest'}
        }, (error, response, body) => {
            let ret = JSON.parse(body);
            expect(ret.key).to.be.equal('redishashoptest');
            expect(ret.count).to.be.equal(2);
            expect(ret.result).to.contain('item1');
            expect(ret.result).to.contain('item2');
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