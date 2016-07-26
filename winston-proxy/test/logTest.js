

describe('log test', () => {
    before(done => {
        let opts = {workerId: 9, debug: false, foreground: false};
        require('../index.js')(opts);

        done();
    });

    it('pre defined log', done => {
        let logger = require('../index.js')('preDefinedLog');
        logger.info('--- info msg, this should be logged.');
        logger.debug('--- debug msg, this should not be logged');
        logger.error('--- error msg, this should be logged');
        done();
    });

    it('with console print', done => {
        let opts = {foreground: true};
        let logger = require('../index.js')('consolePrint', opts);
        logger.info('info msg, this should be print.');
        logger.debug('debug msg, this should be print');
        logger.error('error msg, this should be print');
        done();
    });

    it('special options', done => {
        let opts = {foreground: false, debug: true };
        let logger = require('../index.js')('specialOpt', opts);
        logger.debug('debug msg, this should be logged');
        logger.info('info msg, this should be logged');
        logger.error('error msg, this should be logged');
        done();
    });
});