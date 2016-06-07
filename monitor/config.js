var config = {};

config.servicePort = 8080;

config.io_port = 10001;
config.api_port = 11001;
config.mochaInterval = 100000;

config.ipFileName = ['ipList'];
config.ioHost = 'localhost';
config.apiHost = 'localhost';
config.ips= ['127.0.0.1:11001'];

config.cmdStr = 'mocha -t 10000 --reporter reporter.js test/index.js >> mocha.log ';
module.exports = config;
