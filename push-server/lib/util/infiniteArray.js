module.exports = InfiniteArray;

function InfiniteArray(array = []) {
    if (!(this instanceof InfiniteArray)) return new InfiniteArray(array);
    this.array = array;
    this.index = 0;
}

InfiniteArray.prototype.next = function () {
    if(!this.array || this.array.length == 0){
        return;
    }
    const ret = this.array[this.index];
    if (++this.index == this.array.length) {
        this.index = 0;
    }
    return ret;
};

InfiniteArray.prototype.hasNext = function () {
    return this.array && this.array.length > 0;
};