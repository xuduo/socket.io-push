module.exports = (config, arrivalStats) => {
  return new UmengProvider(config, arrivalStats);
};

const logger = require('winston-proxy')('UmengProvider');
const dateformat = require('dateformat');
const md5 = require('md5');

const util = require('socket.io-push-redis/util');
const request = require('request');
const sendUrl = "http://msg.umeng.com/api/send";
const sendAllUrl = "https://api.xmpush.xiaomi.com/v3/message/all";
const traceUrl = "http://msg.umeng.com/api/status";
const timeout = 5000;

class UmengProvider {

  constructor(config, arrivalStats) {
    logger.debug('UmengProvider init ', config);
    this.arrivalStats = arrivalStats;
    this.appKey = config.appKey;
    this.masterSecret = config.masterSecret;
    this.type = "umeng";
  }

  sign(params) {
    return md5(`POST${sendUrl}${params}${this.masterSecret}`)
  }

  sendMany(notification, tokenDataList, timeToLive, callback) {
    if (notification.android.title) {
      const params = this.getPostData(notification, tokenDataList, timeToLive);
      const body = JSON.stringify(params);
      const sign = this.sign(body);
      request.post({
        url: sendUrl + '?sign=' + sign,
        body: body,
        timeout: timeout
      }, (error, response, body) => {
        logger.debug("sendMany result", error, response && response.statusCode, body);
        if (this.success(error, response, body, callback, notification.id)) {
          return;
        }
        logger.error("sendMany error", error, response && response.statusCode, body);
      })
    }
  }

  sendAll(notification, timeToLive, callback) {
    if (notification.android.title) {
      const params = this.getPostData(notification, 'pushAll', timeToLive);
      const body = JSON.stringify(params);
      const sign = this.sign(body);
      request.post({
        url: sendUrl + '?sign=' + sign,
        body: body,
        timeout: timeout
      }, (error, response, body) => {
        logger.debug("sendAll result", error, response && response.statusCode, body);
        if (this.success(error, response, body, callback, notification.id)) {
          return;
        }
        logger.error("sendAll error", error, response && response.statusCode, body);
      })
    }
  }

  getPostData(notification, tokenDataList, timeToLive) {
    const postData = {
      appkey: this.appKey,
      timestamp: Date.now(),
      description: notification.android.title,
      payload: {
        display_type: 'message',
        body: {
          custom: {
            title: notification.android.title,
            message: notification.android.message,
            payload: notification.android.payload,
            id: notification.id
          }
        }
      }
    };
    if (tokenDataList == 'pushAll') {
      postData.type = 'broadcast';
    } else {
      postData.type = 'listcast';
      postData.device_tokens = tokenDataList.map((tokenData) => {
        return tokenData.token;
      }).join();
    }
    if (timeToLive > 0) {
      const expire_time = dateformat(Date.now() + timeToLive, "yyyy-mm-dd HH:MM:ss");
      postData.policy = {
        expire_time
      }
    }
    return postData;
  }

  success(error, response, body, callback, notificationId) {
    if (callback) {
      callback(error);
    }
    if (!error && response && response.statusCode == 200) {
      const result = JSON.parse(body);
      logger.debug("response result ", result);
      if (result.data && result.data.task_id) {
        this.arrivalStats.addArrivalInfo(notificationId, {}, {
          umeng_task_id: result.data.task_id
        });
      }
      if (result.ret == 'SUCCESS') {
        return true;
      }
    }
    return false;
  }

  trace(packetInfo, callback) {
    if (packetInfo.umeng_task_id) {
      const params = {
        "appkey": this.appkey, // 必填
        "timestamp": Date.now(), // 必填
        "task_id": packetInfo.umeng_task_id // 必填 消息发送时，从返回消息中获取的task_id
      };
      const body = JSON.stringify(params);
      const sign = this.sign(body);
      request.post({
        url: sendUrl + '?sign=' + sign,
        body: body,
        timeout: timeout
      }, (error, response, body) => {
        logger.info("trace result", error, response && response.statusCode, body);
        try {
          const result = JSON.parse(body);
          if (result.data) {
            delete packetInfo.umeng_task_id;
            packetInfo.umeng = result.data;
          }
        } catch (e) {}
        callback();
      })
    } else {
      callback();
    }
  }
}
