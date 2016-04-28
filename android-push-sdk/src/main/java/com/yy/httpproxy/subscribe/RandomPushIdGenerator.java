package com.yy.httpproxy.subscribe;

import java.math.BigInteger;
import java.security.SecureRandom;

/**
 * Created by xuduo on 10/20/15.
 */
public class RandomPushIdGenerator implements PushIdGenerator {

    @Override
    public String generatePushId() {
        return new BigInteger(130, new SecureRandom()).toString(32);

    }

}
