## topic概念 应用于如直播APP的直播间

1. **性能**

    可以支持20W以上用户在同一个topic
    
2. **对topic发送广播**
  
    见API文档 /api/topicOnline
     
     
3. **启用在线查询接口**

```
//config-proxy.js

config.topicOnlineFilter = {
  chatRoom: 'devices',
  drawTopic: 'count'
};
//在线统计功能, 以chatRoom开头的topic会进行统计在线, 并提供查询接口
// devices -- 统计设备列表 count -- 只统计总数
// 对于同时在线特别大的频道不建议统计设备列表
```

4. **topic在线查询接口**

     见API文档 /api/topicOnline
