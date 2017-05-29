module.exports = {

  moreThanOneTrue: function() {
    let count = 0;
    for (const item of arguments) {
      if (item) {
        count++;
      }
    }
    return count > 1;
  },

  parseArrayParam: function(param) {
    let arr;
    if (typeof param === 'string') {
      if (param.startsWith('[')) {
        arr = JSON.parse(param);
      } else if (param) {
        arr = [param];
      }
    } else if (typeof param === 'number') {
      arr = [param];
    } else {
      arr = param;
    }
    return arr;
  },

  parseNumber: function(param) {
    return parseInt(param) || 0;
  }

};
