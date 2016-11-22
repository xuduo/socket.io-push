"use strict";

let logger = require('winston-proxy')('Index-cluster');
let cluster = require('cluster');
let fs = require('fs');
let path = process.cwd();
let net = require('net');


function InitProxyServer() {
    let proxyServer = require('./lib/proxy');
    let sticky = require('socketio-sticky-session');

    let proxy = {};
    try {
        proxy = require(path + "/config-proxy");
    } catch (ex) {
        logger.warn('config-proxy exeception: ' + ex);
    }
    proxy.instances = proxy.instances || 0;

    let srvs = sticky(proxy.instances, () => {
        let proxySrv = new proxyServer(proxy);
        return proxySrv.getProxyInnerServers();
    });

    if (srvs.http) {
        srvs.http.listen(proxy.http_port);
        console.log('srvs http ', proxy.http_port);
    }
    if (srvs.https) {
        srvs.https.listen(proxy.https_port);
        console.log('srvs https', proxy.https_port);
    }
}

InitProxyServer();

