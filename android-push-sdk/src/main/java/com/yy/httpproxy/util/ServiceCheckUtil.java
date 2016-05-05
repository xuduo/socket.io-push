package com.yy.httpproxy.util;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.util.Log;

import com.yy.httpproxy.thirdparty.HuaweiNotificationReceiver;
import com.yy.httpproxy.thirdparty.XiaomiNotificationReceiver;

import java.util.List;

public class ServiceCheckUtil {

    public static boolean huaweiServiceDeclared(Context context) {
        return isServiceAvailable(context, HuaweiNotificationReceiver.class);
    }

    public static boolean xiaomiServiceDeclared(Context context) {
        return isServiceAvailable(context, XiaomiNotificationReceiver.class);
    }

    private static boolean isServiceAvailable(Context context, Class className) {
        final PackageManager packageManager = context.getPackageManager();
        try {
            final Intent intent = new Intent(context, className);
            List resolveInfo =
                    packageManager.queryBroadcastReceivers(intent,
                            0);
            Log.d("ServiceCheckUtil", "isServiceAvailable " + className + " " + resolveInfo.size());
            return resolveInfo.size() > 0;
        } catch (Exception e) {
            return false;
        }


    }
}
