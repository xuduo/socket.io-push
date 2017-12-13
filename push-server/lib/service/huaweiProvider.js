module.exports = (config, stats, mongo) => {
  return new HuaweiProvider(config, stats, mongo);
};

const logger = require('winston-proxy')('HuaweiProvider');
const request = require('requestretry');
const tokenUrl = "https://login.vmall.com/oauth2/token";
const apiUrl = "https://api.push.hicloud.com/pushsend.do";
const timeout = 5000;
const dateformat = require('dateformat');

class HuaweiProvider {

  constructor(config, stats, mongo) {
    this.stats = stats;
    this.mongo = mongo;
    this.access_token = "";
    this.authInfo = {};
    this.default_package_name = undefined;
    config.forEach((val) => {
      this.authInfo[val.package_name] = val;
      val.access_token_expire = 0;
      if (!this.default_package_name) {
        this.default_package_name = val.package_name;
        logger.info('huawei default package name ', this.default_package_name);
      }
    });
    this.type = "huawei";
  }

  sendMany(notification, tokenDataList, timeToLive) {
    if (notification.android.title) {
      const mapTokenData = {};
      for (const tokenData of tokenDataList) {
        const package_name = tokenData.package_name || this.default_package_name;
        if (!this.authInfo[package_name]) {
          logger.error('huawei package name not supported: ', package_name);
          continue;
        }
        const tokenList = mapTokenData[package_name] || [];
        tokenList.push(tokenData.token);
        mapTokenData[package_name] = tokenList;
      }

      for (const package_name in mapTokenData) {
        this.doSendMany(notification, package_name, mapTokenData[package_name], timeToLive);
      }
    }
  }

  doSendMany(notification, package_name, tokens, timeToLive) {
    this.checkToken(package_name, (tokenError) => {
      if (!tokenError) {
        logger.debug("sendMany ", notification, timeToLive);
        this.stats.addTotal(this.type);
        const postData = this.getPostData(notification, package_name, tokens, timeToLive);
        request.post({
          url: apiUrl,
          qs: {
            nsp_ctx: `{"ver":1,"appId":"${this.authInfo[package_name].client_id}"}`
          },
          form: postData,
          timeout: timeout,
          maxAttempts: 2,
          retryDelay: 5000,
          time: true,
          retryStrategy: request.RetryStrategies.NetworkError
        }, (error, response, body) => {
          logger.debug("sendMany result", error, body);
          if (!error && response && response.statusCode == 200) {
            this.stats.addSuccess(this.type, 1, response.elapsedTime);
          } else {
            error = error || 'unknown error';
          }
        });
      }
    });
  }

  getPostData(notification, package_name, tokens, timeToLive) {
    const postData = {
      access_token: this.authInfo[package_name].access_token,
      nsp_svc: "openpush.message.api.send",
      nsp_ts: Date.now()
    };
    postData.payload = {
      hps: {
        msg: {
          type: 3,
          body: {
            content: notification.android.message,
            title: notification.android.title
          },
          action: {
            type: 3,
            param: {
              appPkgName: package_name
            }
          }
        },
        ext: {
          customize: [notification.id, notification.android]
        }
      }
    };
    postData.payload = JSON.stringify(postData.payload);
    postData.device_token_list = JSON.stringify(tokens);

    if (timeToLive > 0) {
      postData.expire_time = this.formatHuaweiDate(new Date(Date.now() + timeToLive));
      logger.debug("postData.expire_time ", postData.expire_time);
    }
    return postData;
  }

  sendAll(notification, timeToLive) {
    if (notification.android.title) {
      for (const package_name in this.authInfo) {
        const cursor = this.mongo.device.find({
          package_name,
          type: 'huawei'
        }).lean().cursor({
          batchSize: 1000
        });
        let batch = [];
        const batchSize = 1000;

        cursor.on('data', (doc) => {
          batch.push(doc.token);
          if (batch.length >= batchSize) {
            this.doSendMany(notification, package_name, batch, timeToLive);
            batch = [];
          }
        }).on('error', (err) => {
          logger.error('sendAll cursor error', package_name, err);
          this.doSendMany(notification, package_name, batch, timeToLive);
          batch = [];
        }).on('end', () => {
          logger.debug('sendAll cursor end', package_name, batch.length);
          this.doSendMany(notification, package_name, batch, timeToLive);
          batch = [];
        });
      }
    }
  }

  checkToken(package_name, callback) {
    const authInfo = this.authInfo[package_name];
    if (authInfo.access_token && Date.now() < authInfo.access_token_expire) {
      callback();
    } else {
      logger.info("request token ", package_name, this.authInfo[package_name]);
      request.post({
        url: tokenUrl,
        form: {
          grant_type: "client_credentials",
          client_id: authInfo.client_id,
          client_secret: authInfo.client_secret
        },
        timeout: timeout,
        maxAttempts: 2,
        retryDelay: 5000,
        retryStrategy: request.RetryStrategies.NetworkError
      }, (error, response, body) => {
        if (!error) {
          const data = JSON.parse(body);
          authInfo.access_token = data.access_token;
          authInfo.access_token_expire = Date.now() + data.expires_in * 1000 - 60 * 1000;
          logger.info("get access token success", data);
          callback();
        } else {
          logger.error("get access token error", body);
          callback(error);
        }
      });
    }
  }

  formatHuaweiDate(date) {
    return dateformat(date, "yyyy-mm-dd'T'HH:MM");
  }

}
