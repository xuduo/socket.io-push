package com.yy.misaka.demo.util;

import com.squareup.okhttp.Callback;
import com.squareup.okhttp.OkHttpClient;
import com.squareup.okhttp.Request.Builder;

import java.util.Map;

/**
 * Created by Administrator on 2016/4/27.
 */
public class HttpUtils {

    private static OkHttpClient okHttpClient=new OkHttpClient();

    public static void request(String url, Map<String, Object> params, Callback callback) {
        StringBuilder okRequestURL = new StringBuilder(url);
        if (params != null) {
            okRequestURL.append("?");
            for (String key : params.keySet()) {
                if (params.get(key) instanceof String) {
                    okRequestURL.append(key).append("=").append(params.get(key).toString()).append("&");
                } else {
                    String encodeStr = JsonHelper.toJson(params.get(key), "UTF-8");
                    okRequestURL.append(key).append("=").append(encodeStr).append("&");
                }
            }
        }
        Builder okBuilder = new Builder().url(okRequestURL.toString());
        okHttpClient.newCall(okBuilder.build()).enqueue(callback);
    }

}
