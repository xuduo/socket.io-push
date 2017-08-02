var request = require('request');
var chai = require('chai');
var expect = chai.expect;
var versionCompare = require('../lib/util/versionCompare');

describe('notification', function() {


  it('test1', function(done) {
    expect(versionCompare('1.5', '1.5.1') < 0).to.be.true;
    expect(versionCompare('1.5.1', '1.5') > 0).to.be.true;
    done();
  });

  it('test2', function(done) {
    expect(versionCompare('2.3.1', '2.4') < 0).to.be.true;
    expect(versionCompare('2.4', '2.3.1') > 0).to.be.true;
    done();
  });

  it('test3', function(done) {
    expect(versionCompare('2.3.5', '2.3.11') < 0).to.be.true;
    expect(versionCompare('2.3.11', '2.3.5') > 0).to.be.true;
    done();
  });

  it('test4', function(done) {
    expect(versionCompare('1.5', '1.5.0') < 0).to.be.true;
    expect(versionCompare('1.5.0', '1.5') > 0).to.be.true;
    done();
  });

  it('test4', function(done) {
    expect(versionCompare('1.6', '1.5.0') > 0).to.be.true;
    expect(versionCompare('1.5.0', '1.6') < 0).to.be.true;
    done();
  });

});
