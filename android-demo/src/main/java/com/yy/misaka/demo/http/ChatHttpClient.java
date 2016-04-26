package com.yy.misaka.demo.http;

public class ChatHttpClient extends BaseHttpClient {

    @Override
    protected HttpSerializer getHttpSerializer() {
        return new ChatHttpSerializer();
    }
}
