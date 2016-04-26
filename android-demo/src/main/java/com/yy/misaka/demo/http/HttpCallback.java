package com.yy.misaka.demo.http;

public abstract class HttpCallback<T> {

    public Class clazz;

    public HttpCallback(Class cls){
        clazz = cls;
    }

    public abstract void onResponseSuccess(T result);

    public abstract void onResponseFailed(int errorCode, String errorMsg);
}
