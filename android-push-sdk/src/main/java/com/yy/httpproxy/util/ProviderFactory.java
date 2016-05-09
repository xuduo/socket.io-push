package com.yy.httpproxy.util;

import android.content.Context;
import android.util.Log;

import com.yy.httpproxy.thirdparty.HuaweiProvider;
import com.yy.httpproxy.thirdparty.NotificationProvider;
import com.yy.httpproxy.thirdparty.XiaomiProvider;

public class ProviderFactory {

    private static final String KEY_HUAWEI_VERSION = "ro.confg.hw_systemversion";
    private static final String KEY_MIUI_VERSION = "ro.miui.ui.version.name";
    private static final String TAG = "ProviderFactory";

    public static NotificationProvider getProvider(Context context) {
        final SystemProperty prop = new SystemProperty(context);
        if (isSystem(prop, KEY_HUAWEI_VERSION)) {
            Log.i(TAG, "HuaweiProvider");
            return new HuaweiProvider(context);
        } else if (isSystem(prop, KEY_MIUI_VERSION)) {
            Log.i(TAG, "XiaomiProvider");
            return new XiaomiProvider(context);
        } else {
            Log.i(TAG, "No provider");
            return null;
        }
    }

    private static boolean isSystem(SystemProperty prop, String key) {
        String value = prop.get(key);
        boolean b = value != null && !value.isEmpty();
        Log.d(TAG, key + " " + value + " " + b);
        return b;
    }

}
