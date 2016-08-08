var util = require('../lib/util/util.js');
var chai = require('chai');
var expect = chai.expect;


describe('util', function () {


    it('getByHash size 0', function (done) {
        var array = [1];
        expect(util.getByHash(array, 'abc')).to.equal(1);
        expect(util.getByHash(array, 'abcd')).to.equal(1);
        done();
    });

    it('getByHash size 10', function (done) {
        var array = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        expect(util.getByHash(array, 'abc')).to.equal(1);
        expect(util.getByHash(array, 'abc')).to.equal(1);
        expect(util.getByHash(array, 'abcdefaaaaaa')).to.equal(2);
        expect(util.getByHash(array, 'abcdefaaaaaa')).to.equal(2);
        expect(util.getByHash(array, 'abc22222')).to.equal(2);
        expect(util.getByHash(array, 'abc22222')).to.equal(2);
        expect(util.getByHash(array, 'defg')).to.equal(5);
        expect(util.getByHash(array, 'defg')).to.equal(5);
        done();
    });


});
