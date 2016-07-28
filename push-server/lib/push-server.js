module.exports = function (opts) {
    return new PushServer(opts);
}

class PushServer {

    constructor(opts) {
        const server = require('http').createServer();
        if (!opts) {
            opts = {};
            try {
                opts.proxy = require("../config-proxy");
            } catch (ex) {
            }
            try {
                opts.api = require("../config-api");
            } catch (ex) {
            }
        }
        if (opts.proxy) {
            this.proxy = require('./proxy')(opts.proxy, server);
        }
        if (opts.api) {
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