push-server 5分钟搭建指南
=======================
一台普通配置的服务器, 如我们使用的16G内存 CPU Xeon E5-2620, 可以很轻松的支撑20万日活APP的推送任务.

## install

* 安装nodejs环境, 推荐6.0以上, LTS版本
* 如果使用苹果apns推送，由于node-http2兼容性问题 node版本必须是6.2.2

https://nodejs.org/en/download/package-manager/

#### 安装/启动redis
```
redis-server &
```

####  安装/更新socket.io-push
```
sudo npm install -g socket.io-push
```

####  新建工作目录, 用于存储日志, 配置文件
```
mkdir push-server    
cd push-server
generate-push-server-config
```

#### 配置

* [config-proxy.js](config-proxy.js), 存在则启动proxy进程.

* [config-api.js](config-api.js), 存在则启动api进程.

* [config-admin.js](config-admin.js) 管理后台配置,存在则启动admin进程.

* [config-log.js](config-log.js) 日志配置

# run
```
push-server -f
-f foreground启动,不指定会后台启动
```

# 默认地址

* 管理后台 [https://localhost:12001](https://localhost:12001)

* 客户端SDK连接HTTP地址: [http://localhost:10001](http://localhost:10001)

* 客户端SDK连接HTTPS地址: [https://localhost:10443](https://localhost:10443)

* API HTTP地址: [http://localhost:11001](http://localhost:11001/)

* API HTTPS地址: [https://localhost:11443](https://localhost:11443)
