package com.yy.httpproxy.util;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;

import java.util.List;

public class ServiceCheckUtil {

    public static boolean huaweiServiceDeclared(Context context) {
        return isServiceAvailable(context, "com.huawei.android.pushagent.PushService");
    }

    private static boolean isServiceAvailable(Context context, String className) {
        final PackageManager packageManager = context.getPackageManager();
        try {
            Class clazz = Class.forName(className);
            final Intent intent = new Intent(context, clazz);
            List resolveInfo =
                    packageManager.queryIntentServices(intent,
                            PackageManager.MATCH_DEFAULT_ONLY);
            return resolveInfo.size() > 0;
        } catch (Exception e) {
            return false;
        }


    }
}
