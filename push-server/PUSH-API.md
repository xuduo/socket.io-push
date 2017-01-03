推送 API


1. string[]类型, 可以使用http标准的如
   get?uid=123&uid=456 
   或者使用uid=["123", "456"]
   
2. string

## /api/push 应用内透传

//推送给abc,def两个客户端.透传数据为字符串hello(hello),到topic=/topic/test

http://yourip:11001/api/push?pushAll=true&json=hello&topic=/topic/test

--- 以下参数3选一,指定推送对象

- topic -> string, 客户端调用subscribeBroadcast的参数
- pushId -> string[] 或 string，客户端生成的随机ID
- uid -> string[] 或 string， 通过addPushIdToUid接口绑定的uid


json ->  以下类型三选一,透传给客户端的数据,客户端会在onPush里接收到

         string "test string" (如要使用其他协议,如protobuf,可以使用base64 encoded string)

         json map  {"uri":1, content:"test string"}

         json array  [1, {"content":"test string"}]

         一般业务建议使用json数组(省流量)

         第一个int或string来表示推送类型,第二个参数表示该类型的透传数据

timeToLive -> int, 毫秒, 表示当时用户不在线, 消息服务器保存多久

## /api/notification 状态栏通知api

http://yourip:11001/api/notification?pushId=true&notification=%7B%20%22android%22%3A%7B%22title%22%3A%22title%22%2C%22message%22%3A%22message%22%7D%2C%22apn%22%3A%7B%22alert%22%3A%22message%22%20%2C%20%22badge%22%3A5%2C%20%22sound%22%3A%22default%22%2C%20%22payload%22%3A1234%7D%7D

--- 以下参数4选一,指定推送对象

pushAll -> string, true表示推送全网,其它或者留空表示单个推送

pushId -> string[], 如 ["abc","def"] 客户端生成的随机ID,单个或者数组

          或 string, 如 "abc"

uid -> string[],如 ["123","456"] 通过addPushIdToUid接口绑定的uid

        或 string, 如 "123"

tag -> string, 如 "tag1", 通过客户端或者服务器接口设置的tag

---

timeToLive -> int, 毫秒, 表示当时用户不在线, 消息服务器保存多久 , 小米, 苹果, 华为, push-sever均支持

---

notification -> 通知消息内容 需要url encode

```
{
  "android" : {"title":"title","message":"message" },
  "apn":  {"alert":"message" , "badge":5, "sound":"default" },
  "payload": { "abc": 123}
}
```

notification是一个json map,内容说明如下

android - 推送给安卓手机的通知内容

apn - 通过apns推送给ios手机的通知内容

title & message - 安卓通知栏的消息标题和内容

alert(ios) - (apn对应的alert字段)消息内容

badge(ios) - (apn对应的badge字段) 可选

sound(ios) - (apn对应的sound字段) 可选

payload - 发送给应用非显示用的透传信息, 需要是一个json map


## /api/uid/bind 绑定UID和pushId

http://yourip:11001/api/uid/bind?pushId=abc&uid=123&platform=ios

pushId -> string(必选),客户端生成的随机ID

uid -> string(必选),服务器需要绑定的UID

timeToLive -> int毫秒(可选), 默认 = 0, 不过期. > 0 时,表示多久客户端没连接到push-sever后, 对应关系过期

platform -> string(可选), 默认 = "default", pushId所属平台

platformLimit -> int(可选), 默认 = 0, 表示不限制. 不为0时, 表示保留多少该平台的pushId绑定关系, 优先删除最旧的绑定关系

## /api/uid/remove 解除pushId的绑定

http://yourip:11001/api/uid/remove?pushId=abc

--- 以下参数2选一,指定推送对象

pushId -> string[], 如 ["abc","def"] 解绑该pushId对应的uid

          或 string, 如 "abc"

uid -> string[],如 ["123","456"] 解绑该uid的所有设备

        或 string, 如 "123"


## /api/topicOnline topic在线数查询

--- 参数

topic -> 查询的topic

## /api/topicDevices topic在线数查询, 包括每台设备的pushId, uid(如果有绑定)

--- 参数

topic -> 查询的topic


## /api/stats/base 服务器实时状态

返回当前各个端(ios/android/browser)实时在线, 细分到每个proxy实例的在线

## /api/redis/get /api/redis/del /redis/hkey /redis/hash(查询对应key hash到的redis实例)

--- 参数

key -> redis key

## /api/isConnected   pushId或者uid 是否在线查询

--- 参数

pushId=123 或者　uid=123

## /api/stats/arrival/info 查询某条notification送达率

--- 参数 

id=xxxxxx 调用notification接口时返回的id
