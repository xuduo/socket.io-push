module.exports = HttpProxyService;

const request = require('request');
const logger = require('winston-proxy')('HttpProxyService');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
const https = require('https');
const httpsAgent = new https.Agent({keepAlive: true});
const http = require('http');
const httpAgent = new http.Agent({keepAlive: true});

function HttpProxyService(removeHeaders) {
    if (!(this instanceof HttpProxyService)) return new HttpProxyService(removeHeaders);
    this.removeHeaders = removeHeaders;
}

HttpProxyService.prototype.request = function (opts, callback) {
    const requestOpts = {
        method: opts[0],
        url: opts[1],
        headers: opts[2]
    };

    if (opts[1].startsWith("https")) {
        requestOpts.agent = httpsAgent;
    } else {
        requestOpts.agent = httpAgent;
    }

    if (requestOpts.method == "get") {
        requestOpts.qs = opts[3];
    } else if (requestOpts.method == "ping") {
        callback([1, {}, requestOpts.url]);
        return;
    } else {
        requestOpts.form = opts[3];
    }

    const self = this

    const start = Date.now();

    request(requestOpts, function (error, response, body) {
            logger.debug("request ", requestOpts.url, Date.now() - start);
            if (error || !response) {
                callback([0, {}, error]);
            } else {
                if (self.removeHeaders) {
                    response.headers = {};
                }
                let resultBody;
                try {
                    resultBody = JSON.parse(body);
                } catch (e) {
                    resultBody = body;
                }
                callback([response.statusCode, response.headers, resultBody]);
            }
        }
    );

}