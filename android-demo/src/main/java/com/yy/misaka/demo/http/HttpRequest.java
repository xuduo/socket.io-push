package com.yy.misaka.demo.http;

import java.util.HashMap;
import java.util.Map;

public class HttpRequest {

    private Map<String, Object> params;
    private Map<String, String> headers;
    private String url;
    private Method method = Method.GET;

    public enum Method {
        POST, GET
    }

    public HttpRequest(Builder builder) {
        params = builder.params;
        url = builder.url;
        method = builder.method;
        headers = builder.headers;
    }

    public Method getMethod() {
        return method;
    }

    public Map<String, Object> getParams() {
        return params;
    }

    public void setParams(Map<String, Object> params) {
        this.params = params;
    }

    public Map<String, String> getHeaders() {
        return headers;
    }

    public void setHeaders(Map<String, String> headers) {
        this.headers = headers;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public void setMethod(Method method) {
        this.method = method;
    }

    public static class Builder {

        private Map<String, Object> params = new HashMap<>();
        private Map<String, String> headers = new HashMap<>();
        private String url;
        private Method method = Method.GET;


        public Builder method(Method method) {
            this.method = method;
            return this;
        }

        public Builder url(String url) {
            this.url = url;
            return this;
        }

        public Builder addStringParams(String key, String value) {
            params.put(key, value);
            return this;
        }

        public Builder addParams(String key, Object value) {
            params.put(key, value);
            return this;
        }

        public Builder addHeader(String key, String value) {
            headers.put(key, value);
            return this;
        }

        public HttpRequest build() {
            return new HttpRequest(this);
        }
    }

}
