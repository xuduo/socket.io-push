var config = {};

config.pingTimeout = 25000;
config.pingInterval = 25000;

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


config.apiAuth = function (path, req, logger) {
    var ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
    logger.info("%s caller ip %s", path, ip);
    return true;
}


config.redis = {

    pubs: [
        {
            groupName: [
                "master_group1",
                "master_group2"],
            sentinel: [
                {host: "127.0.0.1", port: 18301},
                {host: "127.0.0.1", port: 18302},
                {host: "127.0.0.1", port: 18303}]
        },
        {
            groupName: [
                "master_group1",
                "master_group2"],
            sentinel: [
                {host: "127.0.0.1", port: 19301},
                {host: "127.0.0.1", port: 19302},
                {host: "127.0.0.1", port: 19303}]
        }
    ],
    sub: {
        groupName: [
            "master_group1",
            "master_group2"],
        sentinel: [
            {host: "127.0.0.1", port: 19301},
            {host: "127.0.0.1", port: 19302},
            {host: "127.0.0.1", port: 19303}]
    },
    write: [
        { host: "127.0.0.1", port: 6379 }
    ],
    read: [
        { host: "127.0.0.1", port: 6379 }
    ],
    event: [
        {
            host: "127.0.0.1",
            port: 6379
        }
    ]
};


config.io_port = 10001;
config.api_port = 11001;

module.exports = config;
