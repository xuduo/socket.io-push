package com.yy.httpproxy.thirdparty;

import android.content.Context;
import android.os.Bundle;
import android.os.Looper;
import android.util.Log;
import android.widget.Toast;

import com.huawei.android.pushagent.api.PushEventReceiver;
import com.yy.httpproxy.service.ConnectionService;

/**
 * Created by Administrator on 2016/4/29.
 */
public class HuaweiNotificationReceiver extends PushEventReceiver {
    @Override
    public void onToken(Context context, String token, Bundle extras) {
        String belongId = extras.getString("belongId");
        String content = "xxxxx，token = " + token + ",belongId = " + belongId;
        Log.i("HuaweiReceiver", content);
        ConnectionService.setToken(token);
    }

    @Override
    public boolean onPushMsg(Context context, byte[] msg, Bundle bundle) {
        try {
            String content = "收到一条Push消息： " + new String(msg, "UTF-8");
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    public void onEvent(Context context, Event event, Bundle extras) {

        super.onEvent(context, event, extras);
    }


}
