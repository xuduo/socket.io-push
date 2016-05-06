package com.yy.httpproxy.util;

import android.content.Context;
import android.util.NoSuchPropertyException;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

public class SystemProperty {

    private Context mContext;

    public SystemProperty(Context mContext) {
        this.mContext = mContext;
    }

    public String get(String key) {
        try {
            ClassLoader classLoader = mContext.getClassLoader();
            Class SystemProperties = classLoader.loadClass("android.os.SystemProperties");
            Method methodGet = SystemProperties.getMethod("get", String.class);
            return (String) methodGet.invoke(SystemProperties, key);
        } catch (Exception e) {
            return null;
        }
    }

}
