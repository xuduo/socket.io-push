package com.yy.httpproxy.thirdparty;

import android.app.NotificationManager;
import android.content.Context;
import android.util.Log;

import com.xiaomi.mipush.sdk.MiPushCommandMessage;
import com.xiaomi.mipush.sdk.MiPushMessage;
import com.xiaomi.mipush.sdk.PushMessageReceiver;

public class XiaomiNotificationReceiver extends PushMessageReceiver {

    public final static String TAG = "XiaomiNotificationReceiver";

    @Override
    public void onNotificationMessageClicked(Context context, MiPushMessage message) {
        Log.v(TAG, "onNotificationMessageClicked is called. " + message.toString());
        int notifyId = message.getNotifyId();
        if (0 != notifyId) {
            NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            manager.cancel(notifyId);
        }
        String content = "xiaomi clicked： " + message.getMessageId();
        Log.v(TAG, content);
    }

    @Override
    public void onNotificationMessageArrived(Context context, MiPushMessage message) {
        Log.v(TAG, "onNotificationMessageArrived is called. " + message.toString());
    }

    @Override
    public void onCommandResult(Context context, MiPushCommandMessage message) {

        Log.v(TAG,
                "onCommandResult is called. " + message.toString());

//
//
//        String command = message.getCommand();
//        List<String> arguments = message.getCommandArguments();
//        String cmdArg1 = ((arguments != null && arguments.size() > 0) ? arguments.get(0) : null);
//        String cmdArg2 = ((arguments != null && arguments.size() > 1) ? arguments.get(1) : null);
//        String log = "";
//        if (MiPushClient.COMMAND_REGISTER.equals(command)) {
//            if (message.getResultCode() == ErrorCode.SUCCESS) {
//                mRegId = cmdArg1;
//                log = context.getString(R.string.register_success);
//            } else {
//                log = context.getString(R.string.register_fail);
//            }
//        } else if (MiPushClient.COMMAND_SET_ALIAS.equals(command)) {
//            if (message.getResultCode() == ErrorCode.SUCCESS) {
//                mAlias = cmdArg1;
//                log = context.getString(R.string.set_alias_success, mAlias);
//            } else {
//                log = context.getString(R.string.set_alias_fail, message.getReason());
//            }
//        } else if (MiPushClient.COMMAND_UNSET_ALIAS.equals(command)) {
//            if (message.getResultCode() == ErrorCode.SUCCESS) {
//                mAlias = cmdArg1;
//                log = context.getString(R.string.unset_alias_success, mAlias);
//            } else {
//                log = context.getString(R.string.unset_alias_fail, message.getReason());
//            }
//        }  else if (MiPushClient.COMMAND_SET_ACCOUNT.equals(command)) {
//            if (message.getResultCode() == ErrorCode.SUCCESS) {
//                mAccount = cmdArg1;
//                log = context.getString(R.string.set_account_success, mAccount);
//            } else {
//                log = context.getString(R.string.set_account_fail, message.getReason());
//            }
//        } else if (MiPushClient.COMMAND_UNSET_ACCOUNT.equals(command)) {
//            if (message.getResultCode() == ErrorCode.SUCCESS) {
//                mAccount = cmdArg1;
//                log = context.getString(R.string.unset_account_success, mAccount);
//            } else {
//                log = context.getString(R.string.unset_account_fail, message.getReason());
//            }
//        } else if (MiPushClient.COMMAND_SUBSCRIBE_TOPIC.equals(command)) {
//            if (message.getResultCode() == ErrorCode.SUCCESS) {
//                mTopic = cmdArg1;
//                log = context.getString(R.string.subscribe_topic_success, mTopic);
//            } else {
//                log = context.getString(R.string.subscribe_topic_fail, message.getReason());
//            }
//        } else if (MiPushClient.COMMAND_UNSUBSCRIBE_TOPIC.equals(command)) {
//            if (message.getResultCode() == ErrorCode.SUCCESS) {
//                log = context.getString(R.string.unsubscribe_topic_success, mTopic);
//            } else {
//                log = context.getString(R.string.unsubscribe_topic_fail, message.getReason());
//            }
//        } else if (MiPushClient.COMMAND_SET_ACCEPT_TIME.equals(command)) {
//            if (message.getResultCode() == ErrorCode.SUCCESS) {
//                mStartTime = cmdArg1;
//                mEndTime = cmdArg2;
//                log = context.getString(R.string.set_accept_time_success, mStartTime, mEndTime);
//            } else {
//                log = context.getString(R.string.set_accept_time_fail, message.getReason());
//            }
//        } else {
//            log = message.getReason();
//        }
//        MainActivity.logList.add(0, getSimpleDate() + "    " + log);
//
//        Message msg = Message.obtain();
//        msg.obj = log;
//        DemoApplication.getHandler().sendMessage(msg);
    }

    @Override
    public void onReceiveRegisterResult(Context context, MiPushCommandMessage message) {
        Log.v(TAG,
                "onReceiveRegisterResult is called. " + message.toString());
//        String command = message.getCommand();
//        List<String> arguments = message.getCommandArguments();
//        String cmdArg1 = ((arguments != null && arguments.size() > 0) ? arguments.get(0) : null);
//        String log;
//        if (MiPushClient.COMMAND_REGISTER.equals(command)) {
//            if (message.getResultCode() == ErrorCode.SUCCESS) {
//                mRegId = cmdArg1;
//                log = context.getString(R.string.register_success);
//            } else {
//                log = context.getString(R.string.register_fail);
//            }
//        } else {
//            log = message.getReason();
//        }
//
//        Message msg = Message.obtain();
//        msg.obj = log;
//        DemoApplication.getHandler().sendMessage(msg);
    }

    @Override
    public void onReceivePassThroughMessage(Context context, MiPushMessage message) {
        Log.v(TAG,
                "onReceivePassThroughMessage is called. " + message.toString());
//        String log = context.getString(R.string.recv_passthrough_message, message.getContent());
//        MainActivity.logList.add(0, getSimpleDate() + " " + log);
//
//        if(!TextUtils.isEmpty(message.getTopic())) {
//            mTopic=message.getTopic();
//        } else if(!TextUtils.isEmpty(message.getAlias())) {
//            mAlias=message.getAlias();
//        }
//
//        Message msg = Message.obtain();
//        msg.obj = log;
//        DemoApplication.getHandler().sendMessage(msg);
    }
}
