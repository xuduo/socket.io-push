package com.yy.httpproxy.subscribe;

/**
 * Created by xuduo on 10/20/15.
 */
public interface ConnectCallback {

    /**
     *
     * @param uid 连接push-server后,在服务器绑定的uid
     */
    void onConnect(String uid);

    void onDisconnect();

}
