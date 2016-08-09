let config = {};
//输出的最低日志级别 debug < info < error, 默认info
config.debug = true;

//简单日志文件配置
config.filename = 'log/history.log';
config.formatter = function(args){
    let jsonObj = {};
    jsonObj.id = args.meta.id;
    jsonObj.timestamp = args.timestamp;
    jsonObj.service = "me-push";  //不同项目由service区分,一般修改这里就可以
    jsonObj.pid = process.pid;
    jsonObj.ip = "##CTL_IP##";    //电信IP,对于没有电信IP的修改成其他
    jsonObj.logtype = "event";
    jsonObj.level = args.level;
    jsonObj.msg = args.message;
    return JSON.stringify(jsonObj);
};
config.timestamp = function() {
    return Date.now() / 1000 | 0; //取整
};

//轮转日志文件配置
config.dir = 'log';

//是否输出到console, 默认不输出
config.foreground = true;

module.exports = config;