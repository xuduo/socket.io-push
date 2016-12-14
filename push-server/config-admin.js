//后台页面配置, 只启动一个进程
var config = {};

config.https_port = 12001; //admin port

config.api_url = "http://localhost:11001";// api url

config.https_key  = process.cwd() + "/cert/https/key.pem";
config.https_cert = process.cwd() + "/cert/https/cert.pem";

module.exports = config;