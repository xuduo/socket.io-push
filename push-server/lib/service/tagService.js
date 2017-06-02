module.exports = (mongo) => {
  return new TagService(mongo);
};

const logger = require('winston-proxy')('TagService');

class TagService {

  constructor(mongo) {
    this.mongo = mongo;
  }

  setTags(pushId, tags) {
    this.mongo.device.update({
      _id: pushId
    }, {
      tags
    }, {
      upsert: true
    }, (err, doc) => {
      logger.debug('setTags', pushId, tags, doc, err);
    });
  }

  addTag(pushId, tag) {
    this.mongo.device.update({
      _id: pushId
    }, {
      $setOnInsert: {
        tags: [tag]
      }
    }, {
      upsert: true
    }, (err, doc) => {
      logger.debug('addTag setOnInsert', pushId, tag, doc, err);
      if (doc.nModified === 0) {
        this.mongo.device.update({
          _id: pushId
        }, {
          $addToSet: {
            tags: tag
          }
        }, (err, doc) => {
          logger.debug('addTag addToSet', pushId, tag, doc, err);
        });
      }
    });
  }

  removeTag(pushId, tag) {
    this.mongo.device.update({
      _id: pushId
    }, {
      $pull: {
        tags: tag
      }
    }, (err, doc) => {
      logger.debug('removeTag', pushId, tag, err, doc);
    });
  }

  getPushIdsByTag(tag, callback) {
    this.mongo.device.find({
      tags: tag
    }, (err, docs) => {
      const pushIds = [];
      if (!err && docs) {
        for (let doc of docs) {
          pushIds.push(doc._id);
        }
      }
      callback(pushIds);
    });
  }

  getTagsByPushId(pushId, callback) {
    this.mongo.device.findById(
      pushId, (err, doc) => {
        logger.debug('getTagsByPushId ', pushId, err, doc);
        if (!err && doc) {
          callback(doc.tags || []);
        } else {
          callback([]);
        }
      });
  }

  scanPushIdByTag(tag, callback, endCallback) {
    const stream = this.mongo.device.find({
      'tags': tag
    }).stream();
    stream.on('data', (doc) => {
      callback(doc._id);
    }).on('error', () => {
      endCallback();
    }).on('close', () => {
      endCallback();
    });
  }
}
