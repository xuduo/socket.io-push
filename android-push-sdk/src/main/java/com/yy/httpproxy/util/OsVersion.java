package com.yy.httpproxy.util;

import android.content.Context;
import android.util.Log;

public class OsVersion {

    private static final String KEY_EMUI_VERSION_CODE = "ro.build.version.emui";
    private static final String KEY_MIUI_VERSION_NAME = "ro.miui.ui.version.name";

    public static boolean isXiaomi(Context context) {
        final SystemProperty prop = new SystemProperty(context);
        boolean b = prop.getOrThrow(KEY_MIUI_VERSION_NAME).equals("V5")
                || prop.getOrThrow(KEY_MIUI_VERSION_NAME).equals("V6")
                || prop.getOrThrow(KEY_MIUI_VERSION_NAME).equals("V7");
        Log.d("OsVersion", b+"");
        return b;
    }

    public static boolean isHuawei(Context context) {
        final SystemProperty prop = new SystemProperty(context);
        boolean b =prop.getOrThrow(KEY_EMUI_VERSION_CODE).equals("true");
        Log.d("OsVersionHuawei", b+"");
        return b;
    }

    public static String getPhoneVersion(Context context) {
        String version = "既不是小米也不是华为";
        if (isXiaomi(context))
            version = "小米";
        else if (isHuawei(context))
            version = "华为";
        return version;
    }
}
