"use strict";

let logger = require('winston-proxy')('Index-cluster');
let cluster = require('cluster');
let fs = require('fs');
let path = process.cwd();
let net = require('net');

function InitAdminServer() {
    let adminServer = require('./lib/admin');

    let admin;
    try {
        admin = require(path + "/config-admin");
    } catch (ex) {
        logger.warn('config-admin exeception: ' + ex);
    }

    if (admin && cluster.isMaster) {
        new adminServer(admin);
    }
}

InitAdminServer();
