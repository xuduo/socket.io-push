module.exports = (mongo, pid, redisIncreBuffer, packetDropThreshold) => {
  return new Stats(mongo, pid, redisIncreBuffer, packetDropThreshold);
};

const logger = require('winston-proxy')('Stats');
const randomstring = require("randomstring");
const async = require('async');

class Stats {

  constructor(mongo, pid, redisIncreBuffer, packetDropThreshold = 0) {
    this.mongo = mongo;
    this.sessionCount = {
      total: 0
    };
    this.redisIncrBuffer = redisIncreBuffer;
    this.packetDrop = 0;
    this.packetDropThreshold = packetDropThreshold;
    this.interval = 10000;
    this.ms = require('./moving-sum.js')();
    const ipPath = process.cwd() + "/ip";
    const fs = require('fs');
    let ip;
    if (fs.existsSync(ipPath)) {
      ip = fs.readFileSync(ipPath, "utf8").trim() + ":" + pid;
    }
    logger.debug("ip file %s %s", ipPath, ip);
    this.id = ip || randomstring.generate(32);
    if (pid > 0) {
      setInterval(() => {
        this.writeStatsToRedis();
      }, this.interval);
    }
  }

  writeStatsToRedis(callback) {
    if (!callback) {
      callback = () => {};
    }
    const packetAverage = this.ms.sum([10 * 1000]);
    this.packetAverage10s = packetAverage[0] || 0;

    this.mongo.session.update({
      _id: this.id
    }, {
      expireAt: Date.now() + this.interval * 2,
      sessionCount: this.sessionCount,
      packetAverage10s: this.packetAverage10s,
      packetDrop: this.packetDrop,
      packetDropThreshold: this.packetDropThreshold
    }, {
      upsert: true
    }, callback);
  }

  getSessionCount(callback) {
    this.mongo.session.find({}, (err, docs) => {
      const onlineKeys = ["total", "ios", "android", "browser"];
      const processCount = [];
      let packetAverage10s = 0;
      let packetDrop = 0;
      let packetDropThreshold = 0;
      const result = {};
      for (const data of docs) {
        onlineKeys.forEach((key) => {
          if (data.sessionCount[key]) {
            if (!result[key]) {
              result[key] = 0;
            }
            result[key] += data.sessionCount[key];
          }
        });
        packetAverage10s += data.packetAverage10s || 0;
        packetDrop += data.packetDrop || 0;
        packetDropThreshold += data.packetDropThreshold || 0;
        processCount.push({
          id: data._id,
          count: data.sessionCount,
          packetAverage10s: data.packetAverage10s,
          packetDrop: data.packetDrop,
          packetDropThreshold: data.packetDropThreshold
        });
      }
      result.packetAverage10s = packetAverage10s;
      result.packetDrop = packetDrop;
      result.processCount = processCount.sort((a, b) => {
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
      });
      callback(result);
    });
  }

  shouldDrop() {
    if (this.packetDropThreshold != 0 && this.packetAverage10s && this.packetAverage10s > this.packetDropThreshold) {
      logger.debug('threshold exceeded dropping packet %d > %d', this.packetAverage10s, this.packetDropThreshold);
      this.packetDrop++;
      return true;
    } else {
      return false;
    }
  }

  addPlatformSession(platform, count) {
    if (!count) {
      count = 1;
    }
    this.changePlatformCount(platform, count);
  }

  removePlatformSession(platform, count) {
    if (!count) {
      count = 1;
    }
    this.changePlatformCount(platform, count * -1);
  }

  changePlatformCount(platform, count) {
    if (platform) {
      if (!this.sessionCount[platform]) {
        this.sessionCount[platform] = 0;
      }
      this.sessionCount[platform] += count;
    }
  }

  onPacket() {
    const timestamp = Date.now();
    this.packetAverage10s++;
    this.ms.push(timestamp);
    this.redisIncrBuffer.incr("toClientPacket", {
      totalCount: 1
    });
  }

  addPushTotal(count, type) {
    const timestamp = Date.now();
    this.redisIncrBuffer.incr('notification_' + type, {
      totalCount: count
    });
  }

  addPushSuccess(count, type) {
    const timestamp = Date.now();
    this.redisIncrBuffer.incr('notification_' + type, {
      successCount: count
    });
  }

  addPushError(count, errorCode, type) {
    const timestamp = Date.now();
    this.redisIncrBuffer.incr('notification_error_' + type + '_' + errorCode, {
      totalCount: count
    });
  }

  addSession(socket, count) {
    if (!count) {
      count = 1;
    }
    this.sessionCount.total += count;
  }

  removeSession(count) {
    if (!count) {
      count = 1;
    }
    this.sessionCount.total -= count;
  }

  onNotificationReply(timestamp) {
    const latency = Date.now() - timestamp;
    logger.debug('onNotificationReply %s', latency);
    if (latency < 10000) {
      this.redisIncrBuffer.incr("noti", {
        totalCount: 1,
        totalCount: latency
      });
      logger.debug("onNotificationReply %d", latency);
    }
  }

  sortString(a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    if (a < b) return 1;
    if (a > b) return -1;
    return 0;
  }

  find(key, callback) {
    this.mongo.stat.find({
      '_id.key': key
    }).sort({
      timestamp: -1
    }).limit(7 * 24).exec((err, docs) => {
      let totalCount = 0;
      let totalSuccess = 0;
      let avgLatency = 0;
      let successRate = 0;
      let countPerSecond = 0;
      let errorCount = 0;
      let totalLatency = 0;
      if (!err && docs) {
        for (const stat of docs) {
          totalCount += stat.totalCount || 0;
          totalSuccess += stat.successCount || 0;
          totalLatency += stat.totalLatency || 0;
          errorCount += stat.errorCount || 0;
        }
      }
      avgLatency = Math.round(totalLatency / totalSuccess) || 0;
      callback({
        "totalCount": totalCount,
        "totalSuccess": totalSuccess,
        "avgLatency": avgLatency,
        "successRate": successRate,
        "countPerSecond": countPerSecond,
        "chartData": [],
        'stats': docs
      });
    });
  }

  getQueryDataKeys(callback) {
    const aggregatorOpts = [{
      $group: {
        _id: "$_id.key",
        count: {
          $sum: 1
        }
      }
    }];
    this.mongo.stat.aggregate(aggregatorOpts).exec((err, docs) => {
      const keys = [];
      logger.debug('getQueryDataKeys ', err, docs);
      for (const doc of docs) {
        keys.push(doc._id);
      }
      callback(keys);
    });
  }
}
