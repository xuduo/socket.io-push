module.exports = PushServer;

function PushServer(config) {
    if (!(this instanceof PushServer)) return new PushServer(config);
    const server = require('http').createServer();
    const proxy = require('./proxy')(config, server);
    const api = require('./api')(config, server);
}