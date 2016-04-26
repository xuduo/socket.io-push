package com.yy.misaka.demo.appmodel;

import android.app.Application;

import com.yy.httpproxy.Config;
import com.yy.httpproxy.ProxyClient;
import com.yy.misaka.demo.util.ExceptionHandler;
/**
 * Created by xuduo on 3/4/15.
 */
public enum AppModel {

    INSTANCE;
    private ProxyClient proxyClient;
    private HttpApiModel httpApiModel;
    private static final String PUSH_SERVICE_URL = "http://spush.yy.com";
    private static final String API_URL = "http://spush.yy.com/api/push";

    public void init(Application application) {
        Thread.setDefaultUncaughtExceptionHandler(new ExceptionHandler());
        proxyClient = new ProxyClient(new Config(application.getApplicationContext()).setHost(PUSH_SERVICE_URL));
        httpApiModel = new HttpApiModel(API_URL);
    }

    public HttpApiModel getHttpApiModel() {
        return httpApiModel;
    }

    public ProxyClient getProxyClient() {
        return proxyClient;
    }

}
