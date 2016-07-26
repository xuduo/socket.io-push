var fs = require('fs');
var chai = require('chai');
var expect = chai.expect;

describe('log auto delete', () => {
   before(done => {
       fs.access('log', err => {
           if(err) {
               fs.mkdirSync('./log');
           }
           global.testfile = './log/file_to_be_del.log';
           fs.closeSync(fs.openSync(testfile, 'w'));
           fs.utimesSync(testfile, 1451613600, 1451613600); //utime = mtime = '2016-01-01 10:00:00'
           done();
       });
   }) ;

    after(done => {
        fs.readdir('./log', (err, files) => {
            if(!err){
                files.forEach((filename) => {
                    fs.unlinkSync('./log/' + filename);
                });
                fs.rmdirSync('./log');
            }
            done();
        });
    });

    it('auto delete', done => {
        const logger = require('../index.js')({});
        setTimeout(() => {
            fs.access(testfile, err => {
                expect(err).to.be.ok;
                done();
            });
        }, 1000)
    });
});