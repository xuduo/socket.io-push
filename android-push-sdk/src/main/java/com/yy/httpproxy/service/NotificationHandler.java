package com.yy.httpproxy.service;

import android.content.Context;

/**
 * Created by xuduo on 11/6/15.
 */
public interface NotificationHandler {

    /**
     *
     * @param context context
     * @param binded UI进程 是否存活
     * @param notification 服务器下发的notification
     */
    void handlerNotification(Context context, boolean binded, PushedNotification notification);

}
