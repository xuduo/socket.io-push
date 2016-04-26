package com.yy.misaka.demo.http;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;

import com.yy.misaka.demo.util.JsonHelper;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Type;

public class ChatHttpSerializer implements HttpSerializer {

    @Override
    public Object toObject(Object clazz, int statusCode, byte[] body) throws RequestException {
        try {
            if (clazz.equals(Bitmap.class)) {
                InputStream in = new InputStream() {
                    @Override
                    public int read() throws IOException {
                        return 0;
                    }
                };
                try {
                    in = new ByteArrayInputStream(body);
                } catch (Exception e) {
                    e.printStackTrace();
                }
                Bitmap bitmap = BitmapFactory.decodeStream(in);
                return bitmap;
            } else {

                String json = new String(body, "UTF-8");
                if (clazz instanceof Class) {
                    return JsonHelper.toObject(json, (Class) clazz);
                } else {
                    return JsonHelper.jsonToObject(json, (Type) clazz);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            throw new RequestException(e, statusCode, "json 解析异常");
        }
    }

}
