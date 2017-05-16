let config = {};
//输出的最低日志级别 debug < info < warn < error, 默认info
config.level = "debug";

//可选 简单日志文件配置,配合formatter和timestamp可以接入ELK
//config.filename = 'log/history.log';

//可选 轮转日志文件配置
config.rotate_dir = 'log';


//是否输出到console, 默认不输出
config.console = true;

module.exports = config;
