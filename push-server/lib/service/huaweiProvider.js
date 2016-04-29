module.exports = HuaweiProvider;

var logger = require('../log/index.js')('HuaweiProvider');

var util = require('../util/util.js');
var request = require('request');
var tokenUrl = "https://login.vmall.com/oauth2/token";
var apiUrl = "https://api.vmall.com/rest.php";

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

HuaweiProvider.prototype.sendAll = function (notification, timeToLive, callback) {
    var self = this;
    this.checkToken(function () {
        logger.debug("sendAll ", notification, timeToLive);
        var postData = {
            access_token: self.access_token,
            nsp_svc: "openpush.openapi.notification_send",
            nsp_fmt: "JSON",
            nsp_ts: Date.now(),
            push_type: 2,
            android: JSON.stringify({
                notification_title: "wqeqweqweqwe",
                notification_content: "qwewqeqwe",
                doings: 1
            })
        };
        request.post({
            url: apiUrl,
            form: postData
        }, function (error, response, body) {
            logger.info("sendAll result", error, response.statusCode, body);
            if (!error && response.statusCode == 200) {
                callback();
            }
        })
    });
};

HuaweiProvider.prototype.checkToken = function (callback) {
    var self = this;
    if (this.access_token && Date.now() < this.access_token_expire) {
        logger.debug("token valid");
        callback();
        return;
    } else {
        logger.info("request token");
        request.post({
            url: tokenUrl,
            form: {
                grant_type: "client_credentials",
                client_id: self.client_id,
                client_secret: self.client_secret
            }
        }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var data = JSON.parse(body);
                self.access_token = data.access_token;
                self.access_token_expire = Date.now() + data.expires_in * 1000 - 60 * 1000;
                logger.info("get access token success", data);
                callback();
            } else {
                logger.error("get access token error", body);
            }
        });
    }
};