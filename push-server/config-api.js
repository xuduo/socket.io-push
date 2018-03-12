var config = {};

config.http_port = 11001; //api端口, 可选. 不配置,不提供api接口
config.https_port = 11443;
config.host = 'localhost'; //不填或留空表示listen所有interface

config.prefix = 'test'; // 数据库表名/redis pub/sub prefix，用于多个系统公用redis和mongo的情况

config.instances = 3;

config.pushAllInterval = 1 * 1000; // 各个全网推送渠道调用间隔 防止蜂拥

config.https_key = process.cwd() + '/cert/https/key.pem';
config.https_cert = process.cwd() + '/cert/https/cert.pem';

config.statsCommitThreshold = 5000; //ms,统计缓存commit间隔, 生产环境建议10秒以上

config.topicThreshold = {};


//google play 推送 可选
config.fcm = {
  serviceAccount: {
    "type": "service_account",
    "project_id": "socketiodemo",
    "private_key_id": "3d896d67b4323d4195d5432f3834e7d7b184cc40",
    "private_key": `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDAD7iZRgxQLNv3\nZcQvgHxwsPvwmexVrTzXlbMdR6El+77vVwHp+N5lkDCQeL6OrX2xZE9ez6fGbRlP\nRJOEjCdsWz1kAZOR8ZAOHPEmyp0Tnw6PfNCMbYKwoHxaHZFqXKKapYS8jaZr26nF\nY41sInoALIBdI4izkUlhTw5PKODJ5rjfB2fZhx6hxmyixMa+zGPi9J/58fUys6LX\nEOzXmiQCQtjGrGk/voxvydN9MHFm0X0OpkaQI0bCsKsVMFsM/rKAhWZ8grabYX1E\nm0+pR4JUcIsgpTlgzaqPUEDkxG+W8S+zPII9M8RDyGcmbWoQuOTkNNRrttpQBkHr\nFsoGTcoDAgMBAAECggEAUp7QsfrctCbAD3qTPT4ACjhQgQ2uCaNG/5Sx4yAbtivI\nVMxwkdaR0U4IXjXa/6SpZAS7UhVxXp4zG5LsBMKH+Qh87cbx1P/+ENwpbx8NGFI9\noMM4MZiwdkvrgpaipgcome8nHTewRkjODRBI16IzKlz6cVamaVzQHNC13p6+qItc\n9h+yXQvHnmcXOkb+akAk1TF4bLD1zrH4odNRr1sqnslgZ0aJwK++yOEt+DGXPP13\n9BIuXe0YOHIqtANlh0VYBzQoWP9RKaWet9hvvWnGJ9oC7CHAZdaNtNAIOkQQ/gJ+\nS73l924sVlzmkF0OanXulZrZ8vjXZxix2J4Wmp3XKQKBgQD08kC6hDtH6sLWbP3R\nquLKzgFZzavtLpzEvNGxP5BRi84VXYIDIc6IgJFYTxmKhmSPUM4sSwAdKuJYrXjt\nonJ8cgoiIT2jq3cSNj3Nm+EEqlhw+6Vf+zAym5zkvbdGM9OjLiHGMFFLbpHwa9iP\nzkD8ykv4vwpotXRyLS1Ai73GiQKBgQDIuoO0WaPScghaURbPEu+RTlFUAD+Gc1FI\nly9g1e+7+I5VA5xSWxuerpdLvGblgmL+xYU7C37BY+Fqq8OsB14s2mYmZz/8y3yr\nNtXYezI8puae0T/AoRZ7qHHEYlNmpvJE0G8UrnFAD8sAikSXuP8hyfGBuIjYVx+x\nl4xMEzWpKwKBgQDc184kXDRWkwM38OynrTrtPu9Y2Ga6YdxWRSeKd5TW8QXNnZEq\n4cAkskZZKHgOvTzNOj2pEbX4lkGdUkpFdsFiEi+wteetOVsRwHXYe0JVwoAa3cgs\n0XyTJFpAogwr725RIbaxyb6CFB7gdVu7zGorgPkePKBV58QlbTXvjA5+gQKBgFFs\nFvCZS/KZfvnj2rS0oaj3c9X3I82OCXLAoN9O6Kf+8v1ZMZfWjSWY/JYkHjkK4s0l\noh2JVCluMonqkry9YF4hWT5Ks5H/mNp6q9PcZUxlBzd0+b9RmKUgdsWKfPouzidL\nxUNGX3n07guSCrDgwd0a5XQRPrFC5gBL0QUq5aFxAoGBALV5n/hpkMR5WP9Q0JCg\nuhsIUmIdj0deA6i2f94AznhLS8CYxpqA59T/Vof3IUldB4BB7NKae4KwlBzvZDQ0\n5E1A9JuBPsg9T2S1nTkKDKRkMGUY9/x6beoRpB0TE8v002Csl+oID64GTChVRH8A\ntDf0xs7Zg+PgllqObnY/yz7o\n-----END PRIVATE KEY-----\n`,
    "client_email": "firebase-adminsdk-85bnp@socketiodemo.iam.gserviceaccount.com",
    "client_id": "111316098587525102725",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://accounts.google.com/o/oauth2/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-85bnp%40socketiodemo.iam.gserviceaccount.com"
  },
  databaseURL: "https://socketiodemo.firebaseio.com"
}

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

//华为推送配置,可选, 由于华为不支持多包名,需要像apn一样配置一个数组
config.huawei = [{
  package_name: 'com.yy.misaka.demo',
  client_id: 10513719,
  client_secret: '9l7fwfxt0m37qt61a1rh3w0lg9hjza1l'
}, {
  package_name: 'com.yy.misaka.demo2',
  client_id: 10578747,
  client_secret: '43b37a2893af873910eb38b3417d8855'
}];

//小米推送配置,可选, 小米内建支持多包名, 一个配置就可以
config.xiaomi = {
  app_secret: 'ynJJ6b+MkCLyw1cdrg/72w==',
  notify_foreground: 0 //前台不通知
};

//友盟推送配置,可选, 友盟内建支持多包名, 一个配置就可以
config.umeng = {
  appKey: '59229cabf29d982ebd000b4b',
  masterSecret: 'bjgv1ttgt2herpgqxrvmsupazzsumobq'
};

//api调用鉴权,可选
const ipList = ['127.0.0.1'];

config.apiAuth = function(opts, callback) {
  var ip = opts.req.connection.remoteAddress;
  if (ip.length >= 15) ip = ip.slice(7);
  opts.logger.info('%s caller ip %s', opts.req.originalUrl, ip);
  if (opts.req.p.pushAll == 'true' || opts.req.p.tag) {
    console.log(' check auth ' + ipList.indexOf(ip) != -1);
    callback(ipList.indexOf(ip) != -1);
  } else {
    callback(true);
  }
};

config.mongo_log = false;

/**
  存储设备信息，统计数据等使用
*/
config.mongo = {
  default: 'mongodb://localhost/socketiopush',
  arrival: 'mongodb://localhost/socketiopush_arrival'
};

/**
 * 透传使用
 * 数组表示hash切片,可以配置多个redis实例,分担流量/cpu负载
 * pubs 广播pub redis,二维数组 第一级表示redis分组 第二季表示hash切片
 * sub 订阅接收 redis
 * event 客户端断线,连接事件pub的redis.功能可能以后会改,不推荐使用
 */
config.redis = {
  pubs: [
    [{
      host: '127.0.0.1',
      port: 6379
    }]
  ]
};

config.notificationBatchSize = 1000; //如果单次调用notification超过1000个uid, 将会分成多个批次任务

config.notificationBufferSize = 10000; // buffer里最多有多少个分批次任务,超过会清空buffer 默认0, 无限制

config.apnApiUrls = [
  'http://localhost:13001',
  'https://localhost:13443'
]; // 香港/国外代理,用于apn推送

module.exports = config;