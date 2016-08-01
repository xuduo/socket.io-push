var program = require('commander');

program
    .version('0.0.3')
    .usage('[options] <server>')
    .option('-d', 'debug output')
    .option('-f', 'foreground')
    .option('-i', 'info')
    .option('-c, --count <n>', 'process count to start', parseInt)
    .parse(process.argv);

let proxy = {};

try {
    proxy = require(process.cwd() + "/config-proxy");
} catch (ex) {
    console.log(ex);
}
proxy.instances = proxy.instances || 0;

let api = {};

try {
    api = require(process.cwd() + "/config-api");

} catch (ex) {
    console.log(ex);
}
api.instances = api.instances || 0;

var cluster = require('cluster');

if (cluster.isMaster) {
    var totalFork = proxy.instances + api.instances;
    for (var i = 0; i < totalFork; i++) {
        cluster.fork();
    }
    require('fs').writeFile('./num_processes', totalFork + 1, (err) => {
        if (err) {
            console.log("fail to write num of processes");
        }
    });
    console.log("cluster master totalFork ", totalFork);
} else {
    require('winston-proxy')({
        workId: cluster.worker.id,
        dir: 'log',
        foreground: program.F,
        debug: program.D,
        info: program.I,
        count: program.count
    });
    if (cluster.worker.id <= proxy.instances) {
        proxy.instance = cluster.worker.id;
        require('./lib/proxy')(proxy);
    } else if (cluster.worker.id > proxy.instances) {
        api.instance = cluster.worker.id - proxy.instances;
        require('./lib/api')(api);
    }
}