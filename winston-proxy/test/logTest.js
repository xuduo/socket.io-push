var fs = require('fs');
var chai = require('chai');
var expect = chai.expect;

describe('log auto delete', () => {

    before(done => {
        fs.access('log', err => {
            if (err) {
                fs.mkdirSync('./log');
            }
            global.testfile = './log/file_to_be_del.log';
            fs.closeSync(fs.openSync(testfile, 'w'));
            fs.utimesSync(testfile, 1451613600, 1451613600); //utime = mtime = '2016-01-01 10:00:00'
            done();
        });
    });

    after(done => {
        fs.readdir('./log', (err, files) => {
            if (!err) {
                files.forEach((filename) => {
                    fs.unlinkSync('./log/' + filename);
                });
                fs.rmdirSync('./log');
            }
            done();
        });
    });

    it('auto delete', done => {
        require('../index.js')({foreground: true, debug: true});
        setTimeout(() => {
            fs.access(testfile, err => {
                expect(err).to.be.ok;
                done();
            });
        }, 1000)
    });

    it('log test', done => {
        let logger = require('../index.js')('MochaTest');
        let errorMsg = '--- error msg, this should be logged and print';
        let infoMsg = '--- info msg, this should be logged and print.';
        let debugMsg = '--- debug msg, this should be logged and print';
        logger.info(infoMsg);
        logger.debug(debugMsg);
        logger.error(errorMsg);
        fs.readdir('./log', (err, files) => {
            expect(err).to.not.be.ok;
            let date = new Date();
            let dateString = date.getFullYear() + '-' + (date.getMonth() < 9 ? '0' : '' ) + (date.getMonth() + 1) + '-' + (date.getDate() < 10 ? '0' : '') + date.getDate();
            errLogFile = './log/error_' + dateString + '.log';
            debugFile = './log/debug_' + dateString + '.log';
            fs.readFile(errLogFile, (err, data) => {
                expect(err).to.not.be.ok;
                expect(data.toString()).to.string(errorMsg);
                fs.readFile(debugFile, (err, data) => {
                    expect(err).to.not.be.ok;
                    expect(data.toString()).to.string(debugMsg);
                    expect(data.toString()).to.string(infoMsg);
                    done();
                });
            });
        });
    });
});