package com.yy.misaka.demo.util;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonSyntaxException;
import com.google.gson.reflect.TypeToken;

import java.io.UnsupportedEncodingException;
import java.lang.reflect.Type;
import java.net.URLEncoder;
import java.util.List;

public class JsonHelper {

    private static Gson sGson;


    private static Gson getGson() {
        if (sGson == null) {
            GsonBuilder gsonBuilder = new GsonBuilder();
            sGson = gsonBuilder.create();
        }
        return sGson;
    }

    public static <T> T toObject(String jsonString, Class<T> mclass) {
        String s = jsonString;
        Gson gson = new Gson();
        return gson.fromJson(jsonString, mclass);
    }

    public static <T> T jsonToObject(String json, Type tokenType) {
        T t = null;
        try {
            t = getGson().fromJson(json, tokenType);
        } catch (JsonSyntaxException e) {
            e.printStackTrace();
        }
        return t;
    }

    public static <T> List<T> toObjectList(String jsonString, Class<T> mclass) {
        Gson gson = new Gson();
        return gson.fromJson(jsonString,
                new TypeToken<List<T>>() {
                }.getType());
    }

    public static <T> List<T> jsonToObjectList(String json, Type tokenType) {
        List<T> t = null;
        try {
            t = getGson().fromJson(json,
                    new TypeToken<List<T>>() {
                    }.getType());
        } catch (JsonSyntaxException e) {
            e.printStackTrace();
        }
        return t;
    }

    public static<T> String toJson(T object, String encode) {
        String sourceStr = getGson().toJson(object);
        String encodeStr = null;
        try {
            encodeStr = URLEncoder.encode(sourceStr, encode);
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
        }
        return encodeStr;
    }
}
