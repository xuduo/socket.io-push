var config = {};

config.pingTimeout = 25000; //  心跳timeout
config.pingInterval = 25000; // 心跳间隔

config.tokenTTL = 1000 * 3600 * 24 * 30; // apn/xiaomi/huawei timeToLive

//apns推送配置,可选
config.apns = [
    {
        production: false,
        maxConnections: 100,
        bundleId: "com.xuduo.pushtest",
        cert: process.cwd() + "/cert/com.xuduo.pushtest/cert.pem",
        key: process.cwd() + "/cert/com.xuduo.pushtest/key.pem"
    },
    {
        production: false,
        maxConnections: 50,
        bundleId: "com.xuduo.pushtest2",
        cert: process.cwd() + "/cert/com.xuduo.pushtest2/cert.pem",
        key: process.cwd() + "/cert/com.xuduo.pushtest2/key.pem"
    }
];

//华为推送配置,可选
config.huawei = {
    client_id: 10513719,
    client_secret: "9l7fwfxt0m37qt61a1rh3w0lg9hjza1l"
}

//小米推送配置,可选
config.xiaomi = {
    app_secret: "ynJJ6b+MkCLyw1cdrg/72w=="
}

//api调用鉴权,可选
config.apiAuth = function (path, req, logger) {
    var ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
    logger.info("%s caller ip %s", path, ip);
    return true;
}

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
    sub: [
        {host: "127.0.0.1", port: 6379}
    ],
    write: [
        {host: "127.0.0.1", port: 6379}
    ],
    read: [
        {host: "127.0.0.1", port: 6379}
    ],
    event: [
        {
            host: "127.0.0.1",
            port: 6379
        }
    ]
};

config.io_port = 10001; //socket.io 长连接端口
config.api_port = 11001; //api端口, 可选. 不配置,不提供api接口

config.ttl_protocol_version = 2; //默认1, 推荐使用2,省流量

module.exports = config;
