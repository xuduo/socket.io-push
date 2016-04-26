package com.yy.misaka.demo.appmodel;

import android.util.Log;

import com.yy.misaka.demo.ChatActivity;
import com.yy.misaka.demo.entity.CallbackCode;
import com.yy.misaka.demo.entity.Message;
import com.yy.misaka.demo.http.ChatHttpClient;
import com.yy.misaka.demo.http.HttpCallback;
import com.yy.misaka.demo.http.HttpRequest;

public class HttpApiModel {

    private String url;
    private static final String TAG = "HttpApiModel";

    public HttpApiModel(String url) {
        this.url = url;
    }

    private ChatHttpClient httpClient = new ChatHttpClient();

    public void sendMessage(Message msg) {
        HttpRequest.Builder builder = new HttpRequest.Builder();
        String topic = ChatActivity.chatTopic;
        builder.url(url).method(HttpRequest.Method.GET).
                addParams("pushAll", true).addParams("json", msg).addParams("topic", topic);
        final HttpRequest request = builder.build();
        httpClient.request( request, new HttpCallback<CallbackCode>(CallbackCode.class) {

            @Override
            public void onResponseSuccess(CallbackCode result) {
                Log.d(TAG, "Code:" + result.getCode() + "       Message:" + result.getMeaasge());
            }

            @Override
            public void onResponseFailed(int errorCode, String errorMsg) {
                Log.d(TAG, "Code:" + errorCode + "       Message:" + errorMsg);
            }
        });
    }

}
