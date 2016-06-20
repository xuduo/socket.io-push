module.exports = HttpProxyService;

var logger = require('../log/index.js')('HttpProxyService');
var request = require('request');

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

    if (opts[0] == "get") {
        requestOpts.qs = opts[3];
    } else {
        requestOpts.form = opts[3];
    }

    var self = this;

    request(requestOpts, function (error, response, body) {
            if (error || !response) {
                callback([0, {}, error]);
            } else {
                if (self.removeHeaders) {
                    self.removeHeaders.forEach(function (header) {
                        delete response.headers[header];
                    });
                }
                var resultBody;
                try {
                    resultBody = JSON.parse(body);
                } catch (e) {
                    resultBody = body;
                }
                logger.debug("on http ", requestOpts.url, resultBody);
                callback([response.statusCode, response.headers, resultBody]);
            }
        }
    );

}