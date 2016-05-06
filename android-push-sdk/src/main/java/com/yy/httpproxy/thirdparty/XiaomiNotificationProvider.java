package com.yy.httpproxy.thirdparty;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.content.res.Resources;
import android.util.Log;

import com.xiaomi.channel.commonutils.logger.LoggerInterface;
import com.xiaomi.mipush.sdk.Logger;
import com.xiaomi.mipush.sdk.MiPushClient;
import com.yy.httpproxy.service.ConnectionService;

public class XiaomiNotificationProvider implements NotificationProvider {

    public final static String TAG = "XiaomiNotificationProvider";

    public XiaomiNotificationProvider(Context context) {

        // String appId="2882303761517467652";
        // String appKey ="5981746732652";
        String appId = getMetaDataValue(context, "APP_ID");
        String appKey = getMetaDataValue(context, "APP_KEY");
        Log.d(TAG, appId + "          " + appKey);
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
        return null;
    }

    @Override
    public String getType() {
        return null;
    }

    @Override
    public void setToken(String token) {

    }

    private static String getMetaDataValue(Context context, String metaDataName) {
        String stringId = null;
        try {
            ComponentName cn = new ComponentName(context, ConnectionService.class);
            ServiceInfo info = context.getPackageManager()
                    .getServiceInfo(cn, PackageManager.GET_META_DATA);
            stringId = info.metaData.getString(metaDataName);
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
        }
        return stringId;
    }

}
