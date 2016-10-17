module.exports = function () {
    return new NotificationProviderFactory();
};

const logger = require('winston-proxy')('NotificationProviderFactory');

class NotificationProviderFactory {

    constructor() {
        this.providers = {};
    }

    addProvider(provider) {
        this.providers[provider.type] = provider;
    }

    addToken(data) {
        const provider = this.providers[data.type || "apn"];
        logger.debug("addToken %j", data);
        if (provider) {
            provider.addToken(data);
        }
    }

    sendMany(notification, mapTypeToTokenList, timeToLive) {
        for (const type in mapTypeToTokenList) {
            const provider = this.providers[type || "apn"];
            logger.debug("sendMany %s", type);
            if (provider) {
                provider.sendMany(notification, mapTypeToTokenList[type], timeToLive);
            }
        }
    }

    sendAll(notification, timeToLive) {
        for (const key in this.providers) {
            const provider = this.providers[key];
            provider.sendAll(notification, timeToLive);
        }
    }

}
