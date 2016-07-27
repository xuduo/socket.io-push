module.exports = NotificationProviderFactory;

const logger = require('winston-proxy')('NotificationProviderFactory');

function NotificationProviderFactory() {
    if (!(this instanceof NotificationProviderFactory)) return new NotificationProviderFactory();
    this.providers = {};
}

NotificationProviderFactory.prototype.addProvider = function (provider) {
    this.providers[provider.type] = provider;
};

NotificationProviderFactory.prototype.addToken = function (data) {
    const provider = this.providers[data.type || "apn"];
    logger.debug("addToken %j", data);
    if (provider) {
        provider.addToken(data);
    }
};

NotificationProviderFactory.prototype.sendMany = function(notification, mapTypeToTokenList, timeToLive){
    for(const type in mapTypeToTokenList){
        const provider = this.providers[type || "apn"];
        logger.debug("sendMany %s", type);
        if(provider){
            provider.sendMany(notification, mapTypeToTokenList[type], timeToLive);
        }
    }

};

NotificationProviderFactory.prototype.sendAll = function (notification, timeToLive) {
    for (const key in this.providers) {
        const provider = this.providers[key];
        provider.sendAll(notification, timeToLive);
    }
};
