let logger = require('winston-proxy')('Index');

let proxy = {};
try {
    proxy = require(process.cwd() + "/config-proxy");
} catch (ex) {
    logger.warn('config-proxy exeception: ' + ex);
}
proxy.instances = proxy.instances || 0;

let api = {};
try {
    api = require(process.cwd() + "/config-api");
} catch (ex) {
    logger.warn('config-api exeception: ' + ex);
}
api.instances = api.instances || 0;

let admin = {instances: 0};
try {
    admin = require(process.cwd() + "/config-admin");
    admin.instances = 1;
} catch (ex) {
    logger.warn('config-admin exeception: ' + ex);
}

var cluster = require('cluster');

if (cluster.isMaster) {
    var totalFork = proxy.instances + api.instances + admin.instances;
    for (var i = 0; i < totalFork; i++) {
        cluster.fork();
    }
    require('fs').writeFile(process.cwd() + '/num_processes', totalFork, (err) => {
        if (err) {
            logger.error("fail to write num of processes");
        }
    });
    logger.info("cluster master totalFork " + totalFork);
} else {
    if (cluster.worker.id <= proxy.instances) {
        proxy.instance = cluster.worker.id;
        require('./lib/proxy')(proxy);
    } else if (cluster.worker.id > proxy.instances && cluster.worker.id <= ( proxy.instances + api.instances)) {
        api.instance = cluster.worker.id - proxy.instances;
        require('./lib/api')(api);
    } else if (cluster.worker.id == (proxy.instances + api.instances + admin.instances)) {
        require('./lib/admin')(admin);
    }
}