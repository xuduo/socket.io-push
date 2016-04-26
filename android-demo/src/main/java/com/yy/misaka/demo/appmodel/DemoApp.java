package com.yy.misaka.demo.appmodel;

import android.app.Application;
import android.util.Log;

/**
 * Created by xuduo on 3/4/15.
 */
public class DemoApp extends Application {

    private static final String TAG = "DemoApp";

    @Override
    public void onCreate() {
        super.onCreate();
        AppModel.INSTANCE.init(this);
        Log.i(TAG, "onCreate");
    }

    @Override
    public void onTerminate() {
        super.onTerminate();
        Log.i(TAG, "onTerminate");
    }
}
