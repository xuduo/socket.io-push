module.exports = function (opts, instance) {
    return new PushServer(opts, instance);
}

class PushServer {

    constructor(opts, instance = 1) {
        const server = require('http').createServer();
        if (opts.proxy) {
            opts.proxy.instance = instance;
            this.proxy = require('./proxy')(opts.proxy, server);
        }
        if (opts.api) {
            opts.api.instance = instance;
            this.api = require('./api')(opts.api, server);
        }
    }

    close() {
        if (this.proxy) {
            this.proxy.close();
        }
        if (this.api) {
            this.api.close();
        }
    }

}