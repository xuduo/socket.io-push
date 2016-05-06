package com.yy.httpproxy.thirdparty;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.util.Log;

import com.xiaomi.channel.commonutils.logger.LoggerInterface;
import com.xiaomi.mipush.sdk.Logger;
import com.xiaomi.mipush.sdk.MiPushClient;

public class XiaomiNotificationProvider implements NotificationProvider {

    public final static String TAG = "XiaomiProvider";
    private String token;

    public XiaomiNotificationProvider(Context context) {

        String appId = getMetaDataValue(context, "XIAOMI_APP_ID");
        String appKey = getMetaDataValue(context, "XIAOMI_APP_KEY");
        Log.d(TAG, appId + " " + appKey);
        MiPushClient.registerPush(context, appId, appKey);

        LoggerInterface newLogger = new LoggerInterface() {

            @Override
            public void setTag(String tag) {
                // ignore
            }

            @Override
            public void log(String content, Throwable t) {
                Log.d(TAG, content, t);
            }

            @Override
            public void log(String content) {
                Log.d(TAG, content);
            }
        };
        Logger.setLogger(context, newLogger);
        Log.d(TAG, "init");
    }

    @Override
    public String getToken() {
        return token;
    }

    @Override
    public String getType() {
        return "xiaomi";
    }

    @Override
    public void setToken(String token) {
        this.token = token;
    }

    private static String getMetaDataValue(Context context, String metaDataName) {
        String metaDataValue = null;
        try {
            ApplicationInfo appInfo = context.getPackageManager()
                    .getApplicationInfo(context.getPackageName(),
                            PackageManager.GET_META_DATA);
            metaDataValue = appInfo.metaData.getString(metaDataName);
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
        }
        return metaDataValue;

    }

}
