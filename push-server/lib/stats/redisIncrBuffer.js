module.exports = (mongo, commitThreshHold) => {
  return new RedisIncrBuffer(mongo, commitThreshHold);
};

const mSecPerHour = 60 * 60 * 1000;
const expire = 30 * 24 * mSecPerHour;

class RedisIncrBuffer {

  constructor(mongo, commitThreshHold) {
    this.mongo = mongo;
    this.map = {};
    let commitThresHold = commitThreshHold || 20 * 1000;
    setInterval(() => {
      this.commit();
    }, commitThresHold);
  }

  incr(key, by) {
    const currentIncr = this.map[key] || 0;
    if (!this.map[key]) {
      this.map[key] = by;
    } else {
      for (const field in by) {
        if (!this.map[key][field]) {
          this.map[key][field] = 0;
        }
        this.map[key][field] += by[field];
      }
    }
  }

  strip(timestamp, interval = mSecPerHour) {
    return Math.floor(timestamp / interval) * interval;
  }

  commit() {
    const timestamp = this.strip(Date.now());
    const expireAt = timestamp + expire;

    for (const key in this.map) {
      this.mongo.stat.update({
        _id: {
          key,
          timestamp
        }
      }, {
        $inc: this.map[key],
        $set: {
          expireAt
        }
      }, {
        upsert: true
      }, (err, doc) => {

      });
    }
    this.map = {};
  }
}
