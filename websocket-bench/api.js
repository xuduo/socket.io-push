/*global require, process*/

var Benchmark = require('./lib/benchmark.js'),
    DefaultReporter = require('./lib/defaultreporter.js'),
    fs = require('fs'),
    program = require('commander'),
    logger = require('./lib/logger');

program
    .version('0.0.3')
    .usage('[options] <server>')
    .option('-b, --bytes <n>', 'Total number of persistent connection, Default to 100', parseInt)
    .option('-c, --concurency <n>', 'Concurent connection per second, Default to 20', parseInt)
    .parse(process.argv);

if (program.args.length < 1) {
    program.help();
}

var server = program.args[0];

if (!program.bytes) {
    program.bytes = 100;
}

if (!program.concurency) {
    program.concurency = 10;
}

logger.info('Launch bench with ' + program.concurency + ' per sec');

var request = require('superagent');

var randomstring = require("randomstring");

var json = randomstring.generate(100);

function callApi() {
    request
        .post(server + '/api/push')
        .send({
            topic: 'bench-test',
            json: "wwwwwwwwwwwwwwwww"
        })
        .set('Accept', 'application/json')
        .end(function (err, res) {
        });
}

var interval = setInterval(function () {
    for (var i = 0; i < program.concurency; i++) {
        callApi();
    }
}, 1000);


// On ctrl+c
process.on('SIGINT', function () {
    logger.info("\nGracefully stoping worker from SIGINT (Ctrl+C)");
    clearInterval(interval);
});


