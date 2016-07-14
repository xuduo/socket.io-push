var IA = require('../lib/util/infiniteArray');

var expect = require('chai').expect;


describe('infiniteArrayTest', function () {

    it('baseTest', function (done) {
        const array = [1, 2, 3, 4];
        const infiniteArray = IA(array);
        expect(infiniteArray.next()).to.equal(1);
        expect(infiniteArray.next()).to.equal(2);
        expect(infiniteArray.next()).to.equal(3);
        expect(infiniteArray.next()).to.equal(4);
        expect(infiniteArray.next()).to.equal(1);
        expect(infiniteArray.next()).to.equal(2);
        expect(infiniteArray.next()).to.equal(3);
        expect(infiniteArray.next()).to.equal(4);
        expect(infiniteArray.next()).to.equal(1);
        expect(infiniteArray.next()).to.equal(2);
        expect(infiniteArray.next()).to.equal(3);
        expect(infiniteArray.next()).to.equal(4);
        expect(infiniteArray.next()).to.be.ok;
        done();
    });

    it('emptyTest', function (done) {
        const array = [];
        const infiniteArray = IA(array);
        expect(infiniteArray.next()).to.equal(undefined);
        expect(infiniteArray.next()).to.not.be.ok;
        done();
    });

    it('undefinedTest', function (done) {
        const array = undefined;
        const infiniteArray = IA(array);
        expect(infiniteArray.next()).to.equal(undefined);
        expect(infiniteArray.next()).to.not.be.ok;
        done();
    });

    it('nullTest', function (done) {
        const infiniteArray = IA();
        expect(infiniteArray.next()).to.equal(undefined);
        expect(infiniteArray.next()).to.not.be.ok;
        done();
    });

});
