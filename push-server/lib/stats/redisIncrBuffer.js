module.exports = (mongo, commitThreshHold) => {
  return new RedisIncrBuffer(mongo, commitThreshHold);
};

const mSecPerHour = 60 * 60 * 1000;
const expire = 30 * 24 * mSecPerHour;

class RedisIncrBuffer {

  constructor(mongo, commitThreshHold) {
    this.mongo = mongo;
    this.collectionMap = {};
    let commitThresHold = commitThreshHold || 20 * 1000;
    setInterval(() => {
      this.commit();
    }, commitThresHold);
  }

  incr(key, by, collection = 'stat') {
    let map = this.collectionMap[collection];
    if (!map) {
      map = {};
      this.collectionMap[collection] = map;
    }
    const currentIncr = map[key] || 0;
    if (!map[key]) {
      map[key] = by;
    } else {
      for (const field in by) {
        if (!map[key][field]) {
          map[key][field] = 0;
        }
        map[key][field] += by[field];
      }
    }
  }

  strip(timestamp, interval = mSecPerHour) {
    return Math.floor(timestamp / interval) * interval;
  }

  commit() {
    const timestamp = this.strip(Date.now());
    const expireAt = timestamp + expire;
    for (const collection in this.collectionMap) {
      console.log('coomitttt ', collection);
      const map = this.collectionMap[collection];
      for (const key in map) {
        let _id = key;
        if (collection == 'stat') {
          _id = {
            key,
            timestamp
          };
        }
        this.mongo[collection].update({
          _id
        }, {
          $inc: map[key],
          $setOnInsert: {
            expireAt
          }
        }, {
          upsert: true
        }, (err, doc) => {

        });
      }
    }
    this.collectionMap = {};
  }
}
