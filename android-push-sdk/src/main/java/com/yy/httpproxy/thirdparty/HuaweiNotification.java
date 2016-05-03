package com.yy.httpproxy.thirdparty;

import android.content.Context;
import android.util.Log;

import com.huawei.android.pushagent.api.PushManager;

/**
 * Created by Administrator on 2016/4/29.
 */
public class HuaweiNotification {

    public HuaweiNotification(Context context){
        Log.d("HuaweiNotification","init");
        PushManager.requestToken(context);
        Log.d("HuaweiNotification","haha");
    }
}
