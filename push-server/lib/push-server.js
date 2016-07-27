module.exports = function (opts) {
    return new PushServer(opts);
}

class PushServer {

    constructor(opts) {
        const server = require('http').createServer();
        if (!opts) {
            opts = {
                proxy: require("../config-proxy"),
                api: require("../config-api")
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