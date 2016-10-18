module.exports = function () {
    return new MovingSum();
};

class MovingSum {

    constructor() {
        this.stamps = [];
    }

    push(timestamp) {
        this.stamps.push(timestamp);
    }

    sum(timespans) {
        const starts = [];
        const current = Date.now();
        timespans.forEach(function (span) {
            starts.push(current - span);
        });
        const sum_ret = [];
        let spliceIndex = 0;
        const totalLength = this.stamps.length;
        this.stamps.forEach(function (stamp, stampIndex) {
            starts.forEach(function (start, sumIndex) {
                if (stamp >= start && !sum_ret[sumIndex]) {
                    sum_ret[sumIndex] = totalLength - stampIndex;
                    if (spliceIndex == 0) {
                        spliceIndex = stampIndex;
                    }
                }
            });
        });
        if (spliceIndex > 0) {
            this.stamps = this.stamps.slice(spliceIndex, totalLength);
        }
        return sum_ret;
    }
}
