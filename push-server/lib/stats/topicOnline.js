module.exports = topicOnline;

var logger = require('../log/index.js')('topicOnline');
var dataDisable = 10000;

function filterTopic(topic, filterArray){
    if(!filterArray || !topic){
        return false;
    }
    for(var i =0; i< filterArray.length; i++){
        if(topic.startsWith(filterArray[i])){
            return true;
        }
    }
    return false;
}

function topicOnline(redis, io, id, filterTopics) {
    if (!(this instanceof topicOnline)) return new topicOnline(redis, io, id, filterTopics);
    this.redis = redis;
    this.io = io;
    this.id = id;
    this.filters = filterTopics;
    this.interval = 20000;
    var self = this;
    setInterval(function () {
        var result = self.io.nsps['/'].adapter.rooms;
        Object.keys(result).forEach(function(key) {
            if(result[key].length > 0 && filterTopic(key, self.filters)) {
                var json = {length: result[key].length, time: Date.now()};
                self.redis.hset("stats#topicOnline#" + key, self.id, JSON.stringify(json));
            }
        });
    },  this.interval);
}

topicOnline.prototype.writeTopicOnline = function(data){
    var self = this;
    Object.keys(data).forEach(function(key) {
        if(data[key].length > 0 && filterTopic(key, self.filters)) {
            var json = {length: data[key].length, time: Date.now()};
            self.redis.hset("stats#topicOnline#" + key, self.id, JSON.stringify(json));
        }
    });
}

topicOnline.prototype.getTopicOnline = function(topic, callback){
    var count = 0;
    var self = this;
    this.redis.hgetall("stats#topicOnline#" + topic, function (err, result) {
        if(result) {
            var delKey =[];
            Object.keys(result).forEach(function (key) {
                var data = JSON.parse(result[key]);
                if((data.time + dataDisable) < Date.now()){
                    delKey.push(key);
                }else{
                    count = count + data.length;
                }
            });
            if(delKey.length > 0){
                self.redis.hdel("stats#topicOnline#" + topic, delKey);
            }
        }
        console.log("result count: " + count);
        callback(count);
    });
}