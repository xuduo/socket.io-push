package com.yy.misaka.demo.http;


public interface HttpSerializer {

    Object toObject(Object clazz, int statusCode, byte[] body) throws RequestException;

}
