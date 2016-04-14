var config = {};

config.servicePort = 8080;

config.io_port = 10001;
config.api_port = 11001;
config.mochaInterval = 100000;

config.ipFileName = ['test/wuxi-duoxian-01', 'test/yunfu-duoxian-01'];
config.ioHost = 'wstt.yy.com';
config.apiHost = 'api.wstt.yy.com';
config.ips= ['183.232.136.141', '120.195.158.51'];

config.cmdStr = 'mocha -t 4000 --reporter reporter.js';
module.exports = config;
