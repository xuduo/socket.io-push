推送 API

##HTTP传参方式

支持以下三种传参方式

1.HTTP GET 如 curl 
```bash
#curl 例子
curl http://localhost:11001/api/test?a=1&b=2
```

2.HTTP POST (FORM) 
```bash
#curl 例子
curl -X POST -F 'a=1' -F 'b=2' http://localhost:11001/api/test
```

3.HTTP POST (JSON) 
```bash
#curl 例子
curl -H "Content-Type: application/json" -X POST -d '{"a":"1" , "b":"2"}' http://localhost:11001/api/test
```

##数组类型参数

1. string[]类型, 可以使用http标准的如
   get?uid=123&uid=456 
   或者使用uid=["123", "456"]
   
2. string

## /api/push 应用内透传

--- 以下参数3选一,指定推送对象

- topic -> string, 客户端调用subscribeBroadcast的参数
- pushId -> string[] 或 string，客户端生成的随机ID
- uid -> string[] 或 string， 通过addPushIdToUid接口绑定的uid


json ->  以下类型三选一,透传给客户端的数据,客户端会在onPush里接收到

string "test string" (如要使用其他协议,如protobuf,可以使用base64 encoded string)

json map  {"uri":1, content:"test string"}

json array  [1, {"content":"test string"}]

建议使用json数组,第0为表示推送类型URI, 省流量, 可通过前面几个字符判断uri，而不解析整串json
         
第一个int或string来表示推送类型,第二个参数表示该类型的透传数据
         
        

timeToLive -> int, 毫秒, 表示当时用户不在线, 消息服务器保存多久

```bash
#推送给topic=chatRoom, 数据为一串json { "message": "curl_test_message", "nickName": "curl_tester", "type": "chat_message"}
curl -H "Content-Type: application/json" -X POST -d '{"topic":"chatRoom" , "json":{ "message": "curl_test_message", "nickName": "curl_tester", "type": "chat_message"}}' http://localhost:11001/api/push
```

## /api/notification 状态栏通知api

--- 以下参数4选一,指定推送对象

pushAll -> string, true表示推送全网,其它或者留空表示单个推送

pushId -> string[], 如 ["abc","def"] 客户端生成的随机ID,单个或者数组或string, 如 "abc"

uid -> string[],如 ["123","456"] 通过addPushIdToUid接口绑定的uid或string, 如 "123"

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


```bash
#推送给uid 123,456两个用户
curl -H "Content-Type: application/json" -X POST -d '{"uid":["123", "456"] , "notification":{"android" : {"title":"title","message":"message" },"apn":{"alert":"message" , "badge":5, "sound":"default" },"payload":{ "abc": 123}}}' http://localhost:11001/api/notification
```

返回值
```json
{ code : "success", id : "abcdefg"}
```

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
