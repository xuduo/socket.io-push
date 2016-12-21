var config = {};

//socket.io 长连接端口
// http 端口,不配置不启用http
config.http_port = 10001;
// https端口,不配置不启用https，　证书＆密钥位置： cert/https/*.pem ;
config.https_port = 10443;
config.https_key = process.cwd() + "/cert/https/key.pem";
config.https_cert = process.cwd() + "/cert/https/cert.pem";

config.instances = 3;

config.pingTimeout = 25000; //  心跳timeout
config.pingInterval = 90000; // 心跳间隔

config.tokenTTL = 1000 * 3600 * 24 * 30; // apn/xiaomi/huawei timeToLive

config.statsCommitThreshold = 0;//ms,统计缓存commit间隔, 生产环境建议10秒以上

config.topicOnlineFilter = ['chatRoom'];//在线统计功能, 以chatRoom开头的topic会进行统计在线, 并提供查询接口

config.packetDropThreshold = 0;

/**
 * 数组表示hash切片,可以配置多个redis实例,分担流量/cpu负载
 * pubs 广播pub redis,二维数组 第一级表示redis分组 第二季表示hash切片
 * sub 订阅接收 redis
 * write 数据存储主库
 * read 数据读从库
 * event 客户端断线,连接事件pub的redis.功能可能以后会改,不推荐使用
 */
config.redis = {
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

config.http_remove_headers = true;
config.topicOnlineFilter = ['u_live_data', 'noti', 'chatRoom'];

config.bindUid = (data, callback) => {
    callback(data.uid);
}

module.exports = config;
