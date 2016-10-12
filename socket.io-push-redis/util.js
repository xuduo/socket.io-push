const util = require('util');
const Emitter = require('events').EventEmitter;

module.exports = {
    getByHash: function (array, key) {
        if (!array || array.length == 0) {
            return;
        }
        if (array.length == 1) {
            return array[0];
        }
        return array[module.exports.hash(key) % array.length];
    },
    hash: function (key) {
        let hash = 0;
        if (!key || key.length == 0) return 0;
        for (let i = 0; i < key.length; i++) {
            const char = key.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    },
    scanHelper: ScanHelper

};

function ScanHelper(streamArr) {
    if (!(this instanceof ScanHelper)) return new ScanHelper(streamArr);
    this.streams = streamArr;
    let streamCount = 0;
    this.streams.forEach((stream) => {
        stream.on('data', (result) => {
            this.emit('data', result);
        });
        stream.on('end', (result) => {
            streamCount++;
            if (streamCount == this.streams.length) {
                this.emit('end', result);
            }
        });
    });
}
util.inherits(ScanHelper, Emitter);

