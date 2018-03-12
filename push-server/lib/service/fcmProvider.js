module.exports = (config, arrivalStats, stats) => {
  return new FcmProvider(config, arrivalStats, stats);
};

const logger = require('winston-proxy')('FcmProvider');

const util = require('socket.io-push-redis/util');
const admin = require('firebase-admin');

class FcmProvider {

  constructor(config, arrivalStats, stats) {
    this.arrivalStats = arrivalStats;
    this.stats = stats;
    try {
      admin.initializeApp({
        credential: admin.credential.cert(config.serviceAccount),
        databaseURL: config.databaseURL
      });
    } catch (err) {}
    this.type = "fcm";
    this.notify_foreground = (config.notify_foreground === 0) ? 0 : 1;
  }

  sendMany(notification, tokenDataList, timeToLive, callback) {
    if (notification.android.title) {

      var message = this.getMessage(notification, timeToLive);

      const tokens = tokenDataList.map((tokenData) => {
        message.token = tokenData.token;
        admin.messaging().send(message)
          .then((response) => {
            // Response is a message ID string.
            logger.debug('Successfully sent message:', response);
          })
          .catch((error) => {
            logger.error('Error sending message:', error);
          });
      });

      this.stats.addTotal(this.type, tokens.count);

      logger.debug('admin send message', message);

    }
  }

  getMessage(notification, timeToLive) {
    logger.debug("getPostData notification ", notification, this.notify_foreground);
    var message = {
      android: {
        ttl: timeToLive || 0, // 1 hour in milliseconds
        priority: 'high',
        notification: {
          title: notification.android.title,
          body: notification.android.message
        }
      },
      data: {
        payload: JSON.stringify({
          title: notification.android.title,
          message: notification.android.message,
          payload: notification.android.payload,
          id: notification.id
        })
      }
    };
    return message;
  }

  sendAll(notification, timeToLive, callback) {
    if (notification.android.title) {
      this.stats.addTotal(this.type + "All");
      var message = this.getMessage(notification, timeToLive);

      message.topic = "all";
      admin.messaging().send(message)
        .then((response) => {
          // Response is a message ID string.
          logger.debug('Successfully sent message:', response);
        })
        .catch((error) => {
          logger.error('Error sending message:', error);
        });

      logger.debug('admin send message', message);
    }
  }


  trace(packetInfo, callback) {
    if (packetInfo.xiaomi_msg_id) {
      request.get({
        url: traceUrl,
        qs: {
          msg_id: packetInfo.xiaomi_msg_id
        },
        headers: this.headers,
        timeout: timeout,
        maxAttempts: 2,
        retryDelay: 5000,
        retryStrategy: request.RetryStrategies.NetworkError
      }, (error, response, body) => {
        logger.info("trace result", error, response && response.statusCode, body);
        try {
          const result = JSON.parse(body);
          if (result.data && result.data.data) {
            delete packetInfo.xiaomi_msg_id;
            if (result.data.data.resolved > 0) {
              packetInfo.xiaomi = result.data.data;
            }
          }
        } catch (e) {}
        callback(packetInfo);
      });
    } else {
      callback(packetInfo);
    }
  }
}