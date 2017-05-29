var config = {};

config.http_port = 13001; //api端口, 可选. 不配置,不提供api接口
config.https_port = 13443;

config.instances = 3;
config.load_balancer = 'round_robin'; // 'round_robin' or 'ip_hash'

config.socketTimeout = 60 * 1000;

config.https_key = process.cwd() + '/cert/https/key.pem';
config.https_cert = process.cwd() + '/cert/https/cert.pem';

//apns推送配置,可选
config.apns = [{
    production: false,
    bundleId: 'com.xuduo.pushtest',
    token: {
      key: process.cwd() + '/cert/com.xuduo.pushtest.p8',
      keyId: 'E75AZZM4Z8',
      teamId: 'PVE2WH4PE2'
    }
  },
  {
    production: false,
    bundleId: 'com.xuduo.pushtest2',
    token: {
      key: process.cwd() + '/cert/com.xuduo.pushtest.p8',
      keyId: 'E75AZZM4Z8',
      teamId: 'PVE2WH4PE2'
    }
  },
  {
    production: false,
    bundleId: 'com.xuduopushtest',
    token: {
      key: process.cwd() + '/cert/com.xuduopushtest.p8',
      keyId: "TA7E8SBDZA",
      teamId: "RA5DTC26D2"
    }
  }
];

module.exports = config;
