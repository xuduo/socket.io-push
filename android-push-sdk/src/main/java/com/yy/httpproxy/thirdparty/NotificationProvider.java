package com.yy.httpproxy.thirdparty;

import java.util.Set;

/**
 * Created by Administrator on 2016/4/29.
 */
public interface NotificationProvider {

    Set getPropertyKeySet();

    void initialize(java.util.Map properties);

    boolean sendMessageNotification(String message);


}
