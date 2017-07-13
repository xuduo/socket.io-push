push-server 5分钟搭建指南
=======================
一台普通配置的服务器, 如我们使用的16G内存 CPU Xeon E5-2620, 可以很轻松的支撑20万日活APP的推送任务.

## install

* 如果使用苹果apns推送，由于node-http2兼容性问题 node版本必须是6.2.2

https://nodejs.org/en/download/package-manager/

#### 安装/启动redis
```
redis-server &
mongod &
```

####  安装/更新socket.io-push
```
sudo npm install -g socket.io-push@version
##npm安装运行, 也可以直接clone代码, 在push-server目录运行node .
```

####  新建工作目录, 用于存储日志, 配置文件
```
mkdir push-server    
cd push-server
generate-push-server-config
```

# run
```
push-server -f
-f foreground启动,不指定会后台启动
```

#### 配置

* [config-proxy.js](config-proxy.js), 存在则启动proxy进程.

* [config-api.js](config-api.js), 存在则启动api进程.

* [config-apn-proxy.js](config-apn-proxy.js) apn代理进程配置, 存在则启动apn代理. 只有在 国内api->香港apn-proxy->苹果 这种部署模式下需要, 否则api进程即可直接调用苹果

* [config-admin.js](config-admin.js) 管理后台配置,存在则启动admin进程.

* [config-log.js](config-log.js) 日志配置


# 默认地址

* 管理后台 [https://localhost:12001](https://localhost:12001)

* 客户端SDK连接HTTP地址: [http://localhost:10001](http://localhost:10001)

* 客户端SDK连接HTTPS地址: [https://localhost:10443](https://localhost:10443)

* API HTTP地址: [http://localhost:11001](http://localhost:11001/)

* API HTTPS地址: [https://localhost:11443](https://localhost:11443)  支持http2 spdy


# Q&A

* 如何多机部署？

    proxy，api，apn-proxy均可以独立部署。只需保证配置中连接同一个mongodb，同一组redis。建议在调用机器上直接部署api进程。proxy前端机器独立部署。
 
     proxy，api，apn-proxy启动多少个进程，由各自config中instance控制，一般api只需要一个即可，proxy cpu数量/2。

* 多个proxy前端情况下，如何负载均衡？

  依靠dns解析到所有前端ip，当然也可以使用lvs。Nginx是不行的，由于长连接是一对一，nginx最多能把机器出口ip占完6w多个连接，远远不能满足需要

* 如何指定只发安卓或者ios？

  notification接口里只传ios或者android，即可指定单一平台发送
