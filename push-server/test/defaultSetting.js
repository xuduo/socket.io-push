var DefaultSetting = {};

DefaultSetting.getDefaultPushService = ()=> {
    return require('../lib/push-server.js')({
        proxy: require("../config-proxy"),
        api: require("../config-api")
    });
}

DefaultSetting.getDefaultPushClient = ()=> {
    let port = require("../config-proxy").port;
    return require('socket.io-push-client')('http://localhost:' + port, {
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

module.exports = DefaultSetting;

