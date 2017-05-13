module.exports = (mongo) => {
    return new TagService(mongo);
};

const logger = require('winston-proxy')('TagService');

class TagService {

    constructor(mongo) {
        this.mongo = mongo;
    }

    addTag(pushId, tag) {
        const tagInsert = {_id: {pushId, tag}};
        logger.debug('add tag', pushId, tag);
        this.mongo.tag.update(tagInsert, tagInsert, {upsert: true}, (err) => {
            if (err) {
                logger.error('add tag error', err);
            }
        });
    }

    removeTag(pushId, tag) {
        this.mongo.tag.findByIdAndRemove({pushId, tag}, (err, doc) => {
            logger.debug('removeTag', doc);
        });
    }

    getPushIdsByTag(tag, callback) {
        this.mongo.tag.find({'_id.tag': tag}, (err, docs) => {
            const pushIds = [];
            if (!err && docs) {
                for (let doc of docs) {
                    pushIds.push(doc._id.pushId);
                }
            }
            callback(pushIds);
        });
    }

    getTagsByPushId(pushId, callback) {
        this.mongo.tag.find({'_id.pushId': pushId}, (err, docs) => {
            const tags = [];
            if (!err && docs) {
                for (let doc of docs) {
                    tags.push(doc._id.tag);
                }
            }
            callback(tags);
        });
    }

    scanPushIdByTag(tag, callback, endCallback) {
        const stream = this.mongo.tag.find({'_id.tag': tag}).stream();
        stream.on('data', (doc) => {
            callback(doc._id.pushId);
        }).on('error', () => {
            endCallback();
        }).on('close', () => {
            endCallback();
        });
    }
}