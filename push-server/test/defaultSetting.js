var DefaultSetting = {};

DefaultSetting.getDefaultPushClient = (pushId)=> {
    let port = require("../config-proxy").port;
    return require('socket.io-push-client')('http://localhost:' + port, {
        pushId: pushId,
        transports: ['websocket', 'polling'],
        useNotification: true
    });
}

DefaultSetting.getDefaultApiUrl = ()=> {
    let port = require("../config-api").port;
    return 'http://localhost:' + port;
}

DefaultSetting.getDefaultApiServer = ()=> {
    return require('../lib/api')(require('../config-api'));
}

DefaultSetting.getDefaultProxyServer = ()=> {
    return require('../lib/proxy')(require('../config-proxy'));
}

module.exports = DefaultSetting;

