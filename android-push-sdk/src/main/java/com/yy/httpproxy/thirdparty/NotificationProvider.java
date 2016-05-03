package com.yy.httpproxy.thirdparty;

import java.util.Set;

/**
 * Created by Administrator on 2016/4/29.
 */
public interface NotificationProvider {


    String getToken();

    String getType();

    void setToken(String token);
}
