var DefaultSetting = {};

DefaultSetting.getDefaultPushClient = (pushId)=> {
    let port = require("../config-proxy").http_port;
    return require('socket.io-push-client')('http://localhost:' + port, {
        pushId: pushId,
        transports: ['websocket', 'polling'],
        useNotification: true
    });
};

DefaultSetting.getDefaultPushHttpsClient = (pushId)=> {
    let port = require("../config-proxy").https_port;
    return require('socket.io-push-client')('https://localhost:' + port, {
        pushId: pushId,
        transports: ['websocket', 'polling'],
        useNotification: true,
        rejectUnauthorized: false
    });
};

DefaultSetting.getDefaultApiUrl = ()=> {
    let port = require("../config-api").port;
    return 'http://localhost:' + port;
};

DefaultSetting.getDefaultApiServer = ()=> {
    let Api = require('../lib/api');
    let config = require('../config-api');
    return new Api(config);
};

DefaultSetting.getDefaultProxyServer = ()=> {
    let Proxy = require('../lib/proxy');
    let config = require('../config-proxy');
    return new Proxy(config, true);
};

DefaultSetting.getAndroidPushClient = (pushId) => {
    let port = require("../config-proxy").port;
    return require('socket.io-push-client')('http://localhost:' + port, {
        pushId: pushId,
        transports: ['websocket', 'polling'],
        useNotification: true,
        platform: 'android'
    })
};

module.exports = DefaultSetting;

