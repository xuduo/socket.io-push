package com.yy.httpproxy.thirdparty;

import android.content.Context;
import android.util.Log;

import com.huawei.android.pushagent.api.PushManager;

import java.util.Map;
import java.util.Set;

/**
 * Created by Administrator on 2016/4/29.
 */
public class HuaweiNotificationProvider implements NotificationProvider{

    private String token;

    public HuaweiNotificationProvider(Context context){
        Log.i("HuaweiNotification","init");
        PushManager.requestToken(context);
    }

    @Override
    public String getToken() {
        return token;
    }

    @Override
    public String getType() {
        return "huawei";
    }

    @Override
    public void setToken(String token) {
        this.token = token;
    }
}
