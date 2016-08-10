let config = {};
//输出的最低日志级别 debug < info < warn < error, 默认info
config.level = "debug";

//简单日志文件配置,配合formatter和timestamp可以接入ELK
config.filename = 'log/history.log';

//轮转日志文件配置
config.rotate_dir = 'log';

config.formatter = function (args) {
    let jsonObj = {};
    jsonObj.id = args.meta.id;
    jsonObj.timestamp = Date.now() / 1000 | 0;
    jsonObj.service = "me_push";  //不同项目由service区分,一般修改这里就可以, 只能用数字小写字母和下划线
    jsonObj.pid = process.pid;
    jsonObj.ip = "##CTL_IP##";    //电信IP,对于没有电信IP的修改成其他
    jsonObj.logtype = "event";
    jsonObj.level = args.level;
    jsonObj.module = args.meta.module;
    jsonObj.msg = args.message;
    return JSON.stringify(jsonObj);
};

//是否输出到console, 默认不输出
config.console = true;

module.exports = config;