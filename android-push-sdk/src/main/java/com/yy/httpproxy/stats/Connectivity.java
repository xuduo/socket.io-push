package com.yy.httpproxy.stats;

import android.util.Log;

import java.util.ArrayList;
import java.util.List;

public class Connectivity {
    private static String TAG = "ConnectivityStats";

    static class ConnectionEvent {
        int type = 0;
        long timestamp = System.currentTimeMillis();

        ConnectionEvent(int type) {
            this.type = type;
        }
    }

    public static class ConnectionTimes {
        long timeConnected;
        long timeTotal;
    }

    private List<ConnectionEvent> events = new ArrayList<>();

    public Connectivity() {
        onDisconnect();
    }

    public void onConnect() {
        Log.v(TAG, "onConnect");
        events.add(new ConnectionEvent(1));
    }

    public void onDisconnect() {
        Log.v(TAG, "onDisconnect");
        events.add(new ConnectionEvent(0));
    }

    public ConnectionTimes getResult() {
        ConnectionEvent latest = events.get(events.size() - 1);
        latest = new ConnectionEvent(latest.type);
        ConnectionEvent current = latest;
        long timeConnected = 0;
        long timeTotal = 0;

        for (int i = events.size() - 1; i >= 0; i--) {
            ConnectionEvent event = events.get(i);
            long span = latest.timestamp - event.timestamp;
            if (event.type == 1) {
                timeConnected += span;
            }
            timeTotal += span;
            latest = event;
        }
        events.clear();
        events.add(current);

        ConnectionTimes result = new ConnectionTimes();
        result.timeConnected = timeConnected / 1000;
        result.timeTotal = timeTotal / 1000;
        Log.v(TAG, "get connectivity result connected " + result.timeConnected + " total :" + result.timeTotal );
        return result;
    }

}
