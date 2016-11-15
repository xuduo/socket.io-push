Push-Server
=======================
一台普通配置的服务器, 如我们使用的16G内存 CPU Xeon E5-2620, 可以很轻松的支撑20万日活APP的推送任务.

##install & run

* 安装nodejs环境, 推荐6.0以上, LTS版本

https://nodejs.org/en/download/package-manager/

* 安装/启动redis
```
redis-server &
```

* 安装/更新socket.io-push
```
sudo npm install -g socket.io-push
```

* 新建工作目录, 用于存储日志, 配置文件
```
mkdir push-server    
cd push-server
```

* 自动生成默认配置

generate-push-server-config

* proxy 进程配置,存在则启动proxy进程.

[config-proxy.js](config-proxy.js)

* api 进程配置,存在则启动api进程.

[config-api.js](config-api.js)

* admin 进程配置,存在则启动admin进程.

[config-admin.js](config-admin.js)


#运行
push-server -f
-f foreground启动,不指定会后台启动

* 管理后台 http://localhost:12001/

* proxy http url : http://localhost:10001/

* proxy https url: http://localhost:10443/

* api url: http://localhost:11001/