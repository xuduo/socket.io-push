var config = {};

config.servicePort = 8080;

config.io_port = 10001;
config.api_port = 11001;
config.mochaInterval = 100000;

config.ipFileName = ['test/wuxi-duoxian-01'];
config.ioHost = 'localhost';
config.apiHost = 'localhost';
config.ips= ['127.0.0.1:11001'];

config.cmdStr = 'mocha -t 4000 --reporter reporter.js';
module.exports = config;
