package com.yy.httpproxy.thirdparty;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Looper;
import android.util.Log;
import android.widget.Toast;

import com.huawei.android.pushagent.api.PushEventReceiver;
import com.yy.httpproxy.service.BindService;
import com.yy.httpproxy.service.ConnectionService;
import com.yy.httpproxy.service.DefaultNotificationHandler;
import com.yy.httpproxy.service.PushedNotification;

import org.json.JSONArray;

/**
 * Created by Administrator on 2016/4/29.
 */
public class HuaweiNotificationReceiver extends PushEventReceiver {

    private static final String TAG = "HuaweiReceiver";

    @Override
    public void onToken(Context context, String token, Bundle extras) {
        String belongId = extras.getString("belongId");
        String content = "xxxxx，token = " + token + ",belongId = " + belongId;
        Log.i(TAG, content);
        ConnectionService.setToken(token);
    }

    @Override
    public boolean onPushMsg(Context context, byte[] msg, Bundle bundle) {
        try {
            String content = "收到一条Push消息： " + new String(msg, "UTF-8");
            Log.d(TAG, content);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return false;
    }

    public void onEvent(Context context, Event event, Bundle extras) {
        if (Event.NOTIFICATION_OPENED.equals(event) || Event.NOTIFICATION_CLICK_BTN.equals(event)) {
            int notifyId = extras.getInt(BOUND_KEY.pushNotifyId, 0);
            if (0 != notifyId) {
                NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                manager.cancel(notifyId);
            }
            String json = extras.getString(BOUND_KEY.pushMsgKey);
            String content = "huawei clicked： " + extras.getString(BOUND_KEY.pushMsgKey);

            try {

                JSONArray obj = new JSONArray(json);

                PushedNotification pushedNotification = new PushedNotification(obj.getString(0), obj.getJSONObject(1));
                Intent clickIntent = new Intent(DefaultNotificationHandler.getIntentName(context));
                clickIntent.putExtra("cmd", BindService.CMD_NOTIFICATION_CLICKED);
                clickIntent.putExtra("id", pushedNotification.id);
                clickIntent.putExtra("notification", pushedNotification.values);
                context.sendBroadcast(clickIntent);
                Log.d(TAG, content);

            } catch (Exception e) {
                Log.e(TAG, "Could not parse malformed JSON: \"" + json + "\"");
            }

        }
    }


}
