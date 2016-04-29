module.exports = NotificationProviderFactory;

var logger = require('../log/index.js')('NotificationProviderFactory');

function NotificationProviderFactory() {
    if (!(this instanceof NotificationProviderFactory)) return new NotificationProviderFactory();
    this.providers = {};
}

NotificationProviderFactory.prototype.addProvider = function (provider) {
    this.providers[provider.type] = provider;
};

NotificationProviderFactory.prototype.addToken = function (data) {
    var provider = this.providers[data.type || "apn"];
    logger.debug("addToken %j", data);
    if (provider) {
        provider.addToken(data);
    }
};

NotificationProviderFactory.prototype.sendOne = function (data, notification, timeToLive) {
    var provider = this.providers[data.type || "apn"];
    if (provider) {
        provider.sendOne(data, notification, timeToLive);
    }
};

NotificationProviderFactory.prototype.sendAll = function (notification, timeToLive) {
    for (var key in this.providers) {
        var provider = this.providers[key];
        provider.sendAll(notification, timeToLive);
    }
};
