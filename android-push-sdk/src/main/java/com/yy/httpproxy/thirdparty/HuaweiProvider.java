package com.yy.httpproxy.thirdparty;

import android.content.Context;
import android.util.Log;

import com.huawei.android.pushagent.api.PushManager;

/**
 * Created by Administrator on 2016/4/29.
 */
public class HuaweiProvider implements NotificationProvider {

    private String token;

    public HuaweiProvider(Context context) {
        Log.i("HuaweiProvider", "init");
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
