package com.yy.misaka.demo.appmodel;

import android.util.Log;

import com.squareup.okhttp.Callback;
import com.squareup.okhttp.Request;
import com.squareup.okhttp.Response;
import com.yy.misaka.demo.ChatActivity;
import com.yy.misaka.demo.entity.Message;
import com.yy.misaka.demo.util.HttpUtils;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class HttpApiModel {

    private String url;
    private static final String TAG = "HttpApiModel";

    public HttpApiModel(String url) {
        this.url = url;
    }

    public void sendMessage(Message msg) {
        Map<String, Object> params = new HashMap<>();
        params.put("pushAll", true);
        params.put("json", msg);
        params.put("topic", ChatActivity.chatTopic);
        HttpUtils.request(url, params, new Callback() {
            @Override
            public void onFailure(Request request, IOException e) {
                Log.d(TAG, "sendMessage onFailure");
            }

            @Override
            public void onResponse(Response response) throws IOException {
                Log.d(TAG, "sendMessage onResponse" + response.body());
            }
        });
    }

}
