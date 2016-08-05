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
    }
};