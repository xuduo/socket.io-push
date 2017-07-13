socket.io-push [![Build Status](https://travis-ci.org/xuduo/socket.io-push.svg?branch=master)](https://travis-ci.org/xuduo/socket.io-push) [![Coverage Status](https://coveralls.io/repos/github/xuduo/socket.io-push/badge.svg?branch=master&a=1)](https://coveralls.io/github/xuduo/socket.io-push?branch=master&a=1)
=======================
基于socket.io协议实现的类似小米,极光,个推的系统.
[视频介绍](http://www.bilibili.com/video/av8531451/)

[![NPM](https://nodei.co/npm/socket.io-push.png?compact=true)](https://npmjs.org/package/socket.io-push)

### 为什么做这个东西？

我们Java后端开发，以提供HTTP API的方式，做了几个简单的增删改查式的APP，但是在开发一款直播类APP的时候遇到了问题

* 直播间内的公屏，礼物广播，如何以最低延迟发给直播间内的用户？
* 频道里都有谁在线？ 都是哪些人？
* 主播断线，或者与主播连麦的人断线了，如何知晓？
* 如何推送离线系统通知（IOS，Android，小米，华为）？


参考其他一些团队的解决方案，大多是用c++写长连接服务器，甚至用Java的netty。开发维护成本太高，所以就有了这套推送系统，我们服务器依旧使用HTTP提供服务，下行推送，也只需要调用一个简单的HTTP接口，如 http://localhost:11001/api/push?topic=abc&json=hello 向abc这个直播间发送一条透传。


### 特点
* 透明集成了小米, 华为push，第三方推送由于政策问题，无法做到
* 支持浏览器, 微信小程序
* 支持Unity3D (完成度很低）
* 与业务服务同机房部署，第三方服务无法比拟

### 性能
* 可以部署70台(实测)或者更多机器, 支持百万以上同时在线
* 单机广播速度可以达到[10W条/秒](bench-mark.md)，如果只使用系统通知功能，单机支撑一个10W左右日活的APP，平均1W以上同时在线，几乎不占机器负载
* 从推送接口调用，到客户端收到回包给服务器，RTT只有280m(线上平均延迟)

### Quick Start
* [5分钟搭建一个单机服务器](push-server)
* [服务器推送Api文档](push-server/PUSH-API.md)
* [Android SDK & Demo](https://github.com/xuduo/socket.io-push-android)
* [IOS SDK & Demo](https://github.com/xuduo/socket.io-push-ios)
* [Browser sdk](push-client)
* QQ技术支持群 128769919

### 高级功能文档
* topic相关(用于实现如直播间观众列表，在线人数实时查询功能)
* 多机器/机房部署
* 苹果推送代理服务器(用于解决api服务器连接美国网络较差问题)
* 统计相关

### 相关文章
* [推送中的坑](readmes/notification-keng.md)
* [送达率计算](readmes/arrive-rate.md)

###名词
* `push-server` 推送服务器, 提供客户端长连接, http api接口
* `业务服务器` push-server api的调用方
* `客户端` 业务app服务器
* `长连接` 客户端到push-server之间的socket.io连接
* `notification` 发送通知栏消息, ios走apns通道, 华为,小米走厂商通道(如配置开启), 浏览器/android手机走长连接
* `push` 协议透传, 走长连接通道. app主进程存活的时候才能收到.主要应用场景如直播间聊天,送礼物,股价实时推送
* `topic` 服务器push广播的对象,类似于直播间/频道的概念, 客户端进入某直播间(id=001)后(topic="room001"),业务服务器可以向此topic发聊天push,subscribe了这个topic的客户端即可收到push
* `pushId` 某个设备的唯一标识, app安装后生成的随机字符串, 用于服务器单播
* `uid` 业务服务器用于标识某个用户的id,字符串类型.可以通过push-server的接口进行绑定,通过客户端SDK解除绑定
* `timeToLive` 过期时间

###Q&A
* 相比第三方推送有什么优劣?

优势:

1. 同机房调用, 成功率100% vs 第三方 99.2%(我们调用小米接口成功率) 99.6%(我们调用华为接口成功率)
2. 测试,正式环境,可以分开部署, 完全隔离
3. 支持苹果推送多bundleId, 开发,发布,马甲版, 都可以自动匹配推送
4. 苹果推送进程可以独立部署在香港/国外

劣势

1. 需要自己运维部署服务器
2. 如果需要扩容, 需要自己来评估, 第三方推送通常是给钱就可以了
