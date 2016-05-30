##性能测试

#####测试机器
CPU Intel(R) Xeon(R) CPU E5-2620 v3 @ 2.40GHz  (n核,24线程)

内存 16G

网卡 1000Mb

#####进程部署
push-server -c 12 启动12个进程

nginx 代理
```
upstream io_proxy
{
        #ip_hash;
        keepalive 32;
        server 127.0.0.1:10001 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:10002 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:10003 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:10004 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:10005 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:10006 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:10007 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:10008 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:10009 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:10010 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:10011 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:10012 max_fails=2 fail_timeout=10s;
}

upstream api_proxy
{
        #ip_hash;
        keepalive 32;
        server 127.0.0.1:11001 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:11002 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:11003 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:11004 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:11005 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:11006 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:11007 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:11008 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:11009 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:11010 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:11011 max_fails=2 fail_timeout=10s;
        server 127.0.0.1:11012 max_fails=2 fail_timeout=10s;
}
```

3台压测机器每台发起 10000连接
```
bin/bench-start-client -w 20 -a 10000 -c 1000 http://wsbench.yy.com
```

#####push topic结果
```
bin/bench-api -b 1000 -c 50 http://wsbench.yy.com:8088
```
机器流量 920Mb

每秒发包量 11.8w

load average 12.4


