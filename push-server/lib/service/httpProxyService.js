module.exports = HttpProxyService;

var request = require('request');
var logger = require('../log/index.js')('HttpProxyService');

function HttpProxyService(removeHeaders) {
    if (!(this instanceof HttpProxyService)) return new HttpProxyService(removeHeaders);
    this.removeHeaders = removeHeaders;
}

HttpProxyService.prototype.request = function (opts, callback) {
    var requestOpts = {
        method: opts[0],
        url: opts[1],
        headers: opts[2]
    };

    if (requestOpts.method == "get") {
        requestOpts.qs = opts[3];
    } else if (requestOpts.method == "ping") {
        callback([1, {}, requestOpts.url]);
        return;
    } else {
        requestOpts.form = opts[3];
    }

    var self = this

    var start = Date.now();

    request(requestOpts, function (error, response, body) {
            logger.debug("request ", requestOpts.url, Date.now() - start);
            if (error || !response) {
                callback([0, {}, error]);
            } else {
                if (self.removeHeaders) {
                    response.headers = {};
                }
                var resultBody;
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