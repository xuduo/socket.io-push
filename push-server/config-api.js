var config = {};

config.http_port = 11001; //api端口, 可选. 不配置,不提供api接口
config.https_port = 11443;

config.instances = 3;

config.https_key = process.cwd() + "/cert/https/key.pem";
config.https_cert = process.cwd() + "/cert/https/cert.pem";

config.tokenTTL = 1000 * 3600 * 24 * 30; // apn/xiaomi/huawei timeToLive

config.statsCommitThreshold = 0;//ms,统计缓存commit间隔, 生产环境建议10秒以上

config.topicThreshold = {};

//apns推送配置,可选
config.apns = [
    {
        production: true,
        maxConnections: 100,
        bundleId: "com.xuduo.pushtest",
        token: {
            key: process.cwd() + "/cert/com.xuduo.pushtest.p8",
            keyId: "E75AZZM4Z8",
            teamId: "PVE2WH4PE2"
        }
    },
    {
        production: false,
        maxConnections: 50,
        bundleId: "com.xuduo.pushtest2",
        cert: process.cwd() + "/cert/com.xuduo.pushtest2/cert.pem",
        key: process.cwd() + "/cert/com.xuduo.pushtest2/key.pem"
    }
];

//华为推送配置,可选, 由于华为不支持多包名,需要像apn一样配置一个数组
config.huawei = [{
    package_name: "com.yy.misaka.demo",
    client_id: 10513719,
    client_secret: "9l7fwfxt0m37qt61a1rh3w0lg9hjza1l"
}, {
    package_name: "com.yy.misaka.demo2",
    client_id: 10578747,
    client_secret: "43b37a2893af873910eb38b3417d8855"
}
];

//小米推送配置,可选, 小米内建支持多包名, 一个配置就可以
config.xiaomi = {
    app_secret: "ynJJ6b+MkCLyw1cdrg/72w=="
};

//api调用鉴权,可选
config.apiAuth = function (path, req, logger) {
    var ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
    logger.info("%s caller ip %s", path, ip);
    return true;
};

/**
 * 数组表示hash切片,可以配置多个redis实例,分担流量/cpu负载
 * pubs 广播pub redis,二维数组 第一级表示redis分组 第二季表示hash切片
 * sub 订阅接收 redis
 * write 数据存储主库
 * read 数据读从库
 * event 客户端断线,连接事件pub的redis.功能可能以后会改,不推荐使用
 */
config.redis = {
    pubs: [
        [
            {host: "127.0.0.1", port: 6379}
        ]
    ],
    write: [
        {host: "127.0.0.1", port: 6379}
    ],
    read: [
        {host: "127.0.0.1", port: 6379}
    ]
};

config.ttl_protocol_version = 2; //默认1, 推荐使用2,省流量

config.routerMaxPushIds = 1000;

config.routerApiUrls = [
    "http://127.0.0.1:11001"
]; //国内api分流

//config.apnApiUrls = [
//    "http://127.0.0.1:11001",
//    "http://127.0.0.1:11020"
//]; // 香港代理,用于apn推送

module.exports = config;
