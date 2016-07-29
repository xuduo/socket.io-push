module.exports = function (opts, instance) {
    return new PushServer(opts, instance);
}

class PushServer {

    constructor(opts, instance = 1) {
        if (opts.proxy) {
            opts.proxy.instance = instance;
            this.proxy = require('./proxy')(opts.proxy);
        }
        if (opts.api) {
            opts.api.instance = instance;
            this.api = require('./api')(opts.api);
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