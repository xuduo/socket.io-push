socket.io-push [![Build Status](https://travis-ci.org/xuduo/socket.io-push.svg?branch=master)](https://travis-ci.org/xuduo/socket.io-push) [![Coverage Status](https://coveralls.io/repos/github/xuduo/socket.io-push/badge.svg?branch=master&a=1)](https://coveralls.io/github/xuduo/socket.io-push?branch=master&a=1)
=======================
基于socket.io协议实现的类似小米,极光,个推的系统.


[![NPM](https://nodei.co/npm/socket.io-push.png?compact=true)](https://npmjs.org/package/socket.io-push)


###特点
* 透明集成了小米,华为push
* 单机广播速度可以达到[10w条/秒](bench-mark.md)
* 同机房情况, 建立长连接->上报pushId->调用api->收到push, 只需要20多毫秒
* uid-pushId绑定功能, 可以分平台，限制绑定数量，过期时间，适合各种帐号多登方案，非常容易
* 支持浏览器推送
* 开源

###文档
* [服务器 push-server](push-server)
* [Android SDK & Demo](https://github.com/xuduo/socket.io-push-android)
* [IOS SDK & Demo](https://github.com/xuduo/socket.io-push-ios)
* [Browser](push-server/lib/client)

###名词
* `push-server` 推送服务器, 提供客户端长连接, http api接口
* `业务服务器` push-server api的调用方
* `客户端` 业务app
* `长连接` 客户端到push-server之间的socket.io连接
* `notification` 发送通知栏消息, ios走apns通道, 华为,小米走厂商通道(如配置开启), 浏览器/android手机走长连接
* `push` 协议透传, 走长连接通道. app主进程存活的时候才能收到.主要应用场景如直播间聊天,送礼物,股价实时推送
* `topic` 服务器push广播的对象,类似于频道的概念, 客户端进入某直播间(id=001)后(topic="room001"),业务服务器可以向此topic发聊天push,subscribe了这个topic的客户端即可收到push
* `pushId` 某个设备的唯一标识, app安装后生成的随机字符串, 用于服务器单播
* `uid` 业务服务器用于标识某个用户的id,字符串类型.可以通过push-server的接口进行绑定,通过客户端SDK解除绑定
* `timeToLive` 过期时间
