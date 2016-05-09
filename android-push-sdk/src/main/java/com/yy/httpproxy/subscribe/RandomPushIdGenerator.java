package com.yy.httpproxy.subscribe;

import android.content.Context;

import java.math.BigInteger;
import java.security.SecureRandom;

/**
 * Created by xuduo on 10/20/15.
 */
public class RandomPushIdGenerator implements PushIdGenerator {

    @Override
    public String generatePushId(Context context) {
        CachedSharedPreference cachedSharedPreference = new CachedSharedPreference(context);
        String pushId = cachedSharedPreference.get("pushId");
        if (pushId == null) {
            pushId = new BigInteger(130, new SecureRandom()).toString(32);
            cachedSharedPreference.save("pushId", pushId);
        }
        return pushId;
    }


}
