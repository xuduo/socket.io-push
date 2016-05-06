package com.yy.httpproxy.thirdparty;

import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.xiaomi.mipush.sdk.ErrorCode;
import com.xiaomi.mipush.sdk.MiPushClient;
import com.xiaomi.mipush.sdk.MiPushCommandMessage;
import com.xiaomi.mipush.sdk.MiPushMessage;
import com.xiaomi.mipush.sdk.PushMessageReceiver;
import com.yy.httpproxy.service.BindService;
import com.yy.httpproxy.service.ConnectionService;
import com.yy.httpproxy.service.DefaultNotificationHandler;
import com.yy.httpproxy.service.PushedNotification;

import org.json.JSONObject;

import java.util.List;

public class XiaomiReceiver extends PushMessageReceiver {

    public final static String TAG = "XiaomiReceiver";

    @Override
    public void onNotificationMessageClicked(Context context, MiPushMessage message) {
        Log.v(TAG, "onNotificationMessageClicked is called. " + message.toString());
        String content = message.getContent();
        try {
            JSONObject obj = new JSONObject(content);
            PushedNotification pushedNotification = new PushedNotification(obj.getString("id"), obj.getJSONObject("android"));
            Intent clickIntent = new Intent(DefaultNotificationHandler.getIntentName(context));
            clickIntent.putExtra("cmd", BindService.CMD_NOTIFICATION_CLICKED);
            clickIntent.putExtra("id", pushedNotification.id);
            clickIntent.putExtra("notification", pushedNotification.values);
            context.sendBroadcast(clickIntent);
            Log.d(TAG, content);
        } catch (Exception e) {
            Log.e(TAG, "onNotificationMessageClicked Could not parse malformed JSON: \"" + content + "\"", e);
        }
    }

    @Override
    public void onNotificationMessageArrived(Context context, MiPushMessage message) {
        Log.v(TAG, "onNotificationMessageArrived is called. " + message.toString());

        String content = message.getContent();

        try {

            JSONObject obj = new JSONObject(content);

            ConnectionService.publishNotification(new PushedNotification(obj.getString("id"), obj.getJSONObject("android")));
            Log.d(TAG, content);

        } catch (Exception e) {
            Log.e(TAG, "onNotificationMessageArrived Could not parse malformed JSON: \"" + content + "\"", e);
        }
    }

    @Override
    public void onCommandResult(Context context, MiPushCommandMessage message) {


    }

    @Override
    public void onReceiveRegisterResult(Context context, MiPushCommandMessage message) {
        Log.v(TAG,
                "onReceiveRegisterResult is called. " + message.toString());

        String command = message.getCommand();
        List<String> arguments = message.getCommandArguments();
        String cmdArg1 = ((arguments != null && arguments.size() > 0) ? arguments.get(0) : null);
        if (MiPushClient.COMMAND_REGISTER.equals(command)) {
            if (message.getResultCode() == ErrorCode.SUCCESS) {
                String regId = cmdArg1;
                Log.i(TAG, "get regId success " + regId);
                ConnectionService.setToken(regId);
            } else {
                Log.i(TAG, "get regId error " + message.getResultCode() + " " + message.getReason());
            }
        }

    }

    @Override
    public void onReceivePassThroughMessage(Context context, MiPushMessage message) {
    }
}
