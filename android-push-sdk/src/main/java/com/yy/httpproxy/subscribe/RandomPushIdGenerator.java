package com.yy.httpproxy.subscribe;

import android.content.Context;

import java.math.BigInteger;
import java.security.SecureRandom;

/**
 * Created by xuduo on 10/20/15.
 */
public class RandomPushIdGenerator implements PushIdGenerator {

    private Context context;

    public RandomPushIdGenerator(Context context) {
        this.context = context;
    }

    @Override
    public String generatePushId() {
        return new BigInteger(130, new SecureRandom()).toString(32);

    }

}
