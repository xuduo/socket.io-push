module.exports = (array) => {
    return new InfiniteArray(array);
};

class InfiniteArray {

    constructor(array = []) {
        this.array = array;
        this.index = 0;
    }

    next() {
        if (!this.array || this.array.length == 0) {
            return;
        }
        const ret = this.array[this.index];
        if (++this.index == this.array.length) {
            this.index = 0;
        }
        return ret;
    }

    hasNext() {
        return this.array && this.array.length > 0;
    }

}
