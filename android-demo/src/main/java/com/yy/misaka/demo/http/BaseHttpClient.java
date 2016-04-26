package com.yy.misaka.demo.http;

import android.os.Handler;
import android.os.Looper;

import com.squareup.okhttp.Callback;
import com.squareup.okhttp.FormEncodingBuilder;
import com.squareup.okhttp.OkHttpClient;
import com.squareup.okhttp.Request;
import com.squareup.okhttp.Request.Builder;
import com.squareup.okhttp.RequestBody;
import com.squareup.okhttp.Response;
import com.yy.misaka.demo.util.JsonHelper;

import java.io.IOException;
import java.util.Map;

public abstract class BaseHttpClient {

    private OkHttpClient mHttpClient;
    private Handler mMainHandler = new Handler(Looper.getMainLooper());


    private OkHttpClient getClient() {
        if (mHttpClient == null) {
            mHttpClient = new OkHttpClient();
        }
        return mHttpClient;
    }

    protected abstract HttpSerializer getHttpSerializer();

    private void post(HttpRequest request, HttpCallback callback) {
        if (request == null) {
            return;
        }
        FormEncodingBuilder formEncodingBuilder = new FormEncodingBuilder();
        Map<String, Object> params = request.getParams();
        if (params != null) {
            for (String key : params.keySet()) {
                formEncodingBuilder.add(key, params.get(key).toString());
            }
        }
        RequestBody formBody = formEncodingBuilder.build();
        Request okRequest = new Request.Builder()
                .url(request.getUrl()).post(formBody).build();
        getClient().newCall(okRequest).enqueue(getCallback(callback));
    }

    private void get(HttpRequest request, final HttpCallback callback) {
        if (request == null) {
            return;
        }
        StringBuilder url = new StringBuilder(request.getUrl());
        Builder okBuilder = new Builder();
        Map<String, String> headers = request.getHeaders();
        if (headers != null) {
            for (String key : headers.keySet()) {
                okBuilder.header(key, headers.get(key));
            }
        }
        Map<String, Object> params = request.getParams();
        if (params != null) {
            url.append("?");
            for (String key : params.keySet()) {
                if (params.get(key) instanceof String) {
                    url.append(key).append("=").append(params.get(key).toString()).append("&");
                } else {
                    String encodeStr = JsonHelper.toJson(params.get(key), "UTF-8");
                    url.append(key).append("=").append(encodeStr).append("&");
                }
            }
        }
        okBuilder.url(url.toString());
        Request okRequest = okBuilder.build();
        getClient().newCall(okRequest).enqueue(getCallback(callback));
    }

    private void onError(final HttpCallback callback, final RequestException e) {
        if (callback == null) {
            return;
        }
        mMainHandler.post(new Runnable() {
            @Override
            public void run() {
                callback.onResponseFailed(0, e.getMessage());
            }
        });
    }

    private void onSuccess(final HttpCallback callback, final Object result) {
        if (callback == null) {
            return;
        }
        mMainHandler.post(new Runnable() {
            @Override
            public void run() {
                callback.onResponseSuccess(result);
            }
        });
    }

    public void request( HttpRequest request, HttpCallback callback) {
        if (request.getMethod() == HttpRequest.Method.GET) {
            get(request, callback);
        } else if (request.getMethod() == HttpRequest.Method.POST) {
            post(request, callback);
        }
    }

    private Callback getCallback(final HttpCallback callback) {
        return new Callback() {
            @Override
            public void onFailure(Request request, IOException e) {

            }

            @Override
            public void onResponse(Response response) throws IOException {
                int statusCode = response.code();
                try {
                    byte[] responseBody = response.body().bytes();
                    final Object result = getHttpSerializer().toObject(callback.clazz, statusCode, responseBody);
                    onSuccess(callback, result);

                } catch (RequestException e) {
                    e.printStackTrace();
                    onError(callback, e);
                }
            }
        };
    }

}
