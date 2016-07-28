var program = require('commander');

program
    .version('0.0.3')
    .usage('[options] <server>')
    .option('-d', 'debug output')
    .option('-f', 'foreground')
    .option('-i', 'info')
    .option('-c, --count <n>', 'process count to start', parseInt)
    .parse(process.argv);


if (!program.count) {
    program.count = 1;
}
var cluster = require('cluster');

let opts = {};

try {
    opts.proxy = require("./config-proxy");
} catch (ex) {
    console.log(ex);
}

try {
    opts.api = require("./config-api");
} catch (ex) {
    console.log(ex);
}

if (cluster.isMaster) {
    for (var i = 0; i < program.count; i++) {
        cluster.fork();
    }
} else {
    instance = cluster.worker.id;
    var args = {
        workId: cluster.worker.id,
        dir: 'log',
        foreground: program.F,
        debug: program.D,
        info: program.I,
        count: program.count
    }
    require('winston-proxy')(args);
    require('./lib/push-server.js')(opts, cluster.worker.id);
}