module.exports = HuaweiProvider;

var logger = require('../log/index.js')('HuaweiProvider');

var util = require('../util/util.js');
var request = require('request');
var apiUrl = "https://login.vmall.com/"

function HuaweiProvider(config) {
    if (!(this instanceof HuaweiProvider)) return new HuaweiProvider(config);
    this.access_token = "";
    this.client_id = config.client_id;
    this.client_secret = config.client_secret;
    this.access_token_expire = 0;
}

HuaweiProvider.prototype.sendOne = function (apnData, notification, timeToLive) {

};

HuaweiProvider.prototype.addToken = function (data) {

};

HuaweiProvider.prototype.sendAll = function (notification, timeToLive) {
    if (!this.access_token) {
        request.post({
            baseUrl: apiUrl,
            uri: "/oauth2/token",
            form: {
                grant_type: "client_credentials",
                client_id: 10513719,
                client_secret: "9l7fwfxt0m37qt61a1rh3w0lg9hjza1l"
            }
        }, function (error, response, body) {
            console.log(body);
            if (!error && response.statusCode == 200) {
                console.log(body) // Show the HTML for the Google homepage.
            }
        })
    }
};

HuaweiProvider.prototype.checkToken = function (callback) {
    var self = this;
    if (this.access_token && Date.now() < this.access_token_expire) {
        callback();
        return;
    } else {
        request.post({
            baseUrl: apiUrl,
            uri: "/oauth2/token",
            form: {
                grant_type: "client_credentials",
                client_id: 10513719,
                client_secret: "9l7fwfxt0m37qt61a1rh3w0lg9hjza1l"
            }
        }, function (error, response, body) {
            console.log(body);
            if (!error && response.statusCode == 200) {
                var data = JSON.parse(body);
                self.access_token = data.access_token;
                self.access_token_expire = Date.now() + data.expires_in * 1000 - 60 * 1000;
            }
        });
    }
};