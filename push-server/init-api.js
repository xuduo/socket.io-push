"use strict";

let logger = require('winston-proxy')('Index-cluster');
let cluster = require('cluster');
let fs = require('fs');
let path = process.cwd();
let net = require('net');

function InitApiServer() {
    let apiServer = require('./lib/api');

    let api = {};
    try {
        api = require(path + "/config-api");
    } catch (ex) {
        logger.warn('config-api exeception: ' + ex);
    }
    api.instances = api.instances || 0;

    if (cluster.isMaster) {
        for (let i = 0; i < api.instances; i++) {
            cluster.fork();
        }
    } else {
        new apiServer(api);
    }
}

InitApiServer();
