package com.yy.misaka.demo;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.util.Log;
import android.view.View;
import android.widget.EditText;

import com.google.gson.Gson;
import com.yy.httpproxy.Config;
import com.yy.httpproxy.ProxyClient;
import com.yy.httpproxy.serializer.JsonSerializer;
import com.yy.httpproxy.subscribe.ConnectCallback;
import com.yy.httpproxy.subscribe.PushCallback;
import com.yy.misaka.demo.adapter.ChatMessagesAdapter;
import com.yy.misaka.demo.appmodel.HttpApiModel;
import com.yy.misaka.demo.entity.Message;
import com.yy.httpproxy.util.OsVersion;

import java.io.UnsupportedEncodingException;
import java.util.Random;

public class ChatActivity extends Activity implements PushCallback, ConnectCallback{

    public final static String chatTopic = "chatRoom";
    public final static String TAG = "ChatActivity";
    private RecyclerView recyclerViewMessages;
    private ProxyClient proxyClient;
    private HttpApiModel httpApiModel = new HttpApiModel(API_URL);
    private ChatMessagesAdapter chatMessagesAdapter;
    public int Colors[] = {Color.BLACK, Color.DKGRAY, Color.CYAN, Color.RED, Color.GREEN, Color.BLUE, Color.YELLOW, Color.MAGENTA};
    public int myColor;
    private static final String PUSH_SERVICE_URL = "http://spush.yy.com";
    private static final String API_URL = "http://spush.yy.com/api/push";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chat);
        init();
    }

    private void init() {
        myColor = Colors[new Random().nextInt(Colors.length)];
        final String nickName = getIntent().getStringExtra("nickName");
        final EditText editTextInput = (EditText) findViewById(R.id.et_input);
        findViewById(R.id.btn_send).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Message message = new Message();
                message.setMessage(String.valueOf(editTextInput.getText()));
                message.setNickName(OsVersion.getPhoneVersion());
                message.setColor(myColor);
                httpApiModel.sendMessage(message);
                editTextInput.setText("");
            }
        });
        LinearLayoutManager linearLayoutManager = new LinearLayoutManager(ChatActivity.this);
        linearLayoutManager.setStackFromEnd(true);
        chatMessagesAdapter = new ChatMessagesAdapter();
        recyclerViewMessages = (RecyclerView) findViewById(R.id.rv_messages);
        recyclerViewMessages.setLayoutManager(linearLayoutManager);
        recyclerViewMessages.setAdapter(chatMessagesAdapter);
        recyclerViewMessages.scrollToPosition(chatMessagesAdapter.getItemCount() - 1);
        proxyClient = new ProxyClient(new Config(this).setHost(PUSH_SERVICE_URL).setConnectCallback(this)
                .setPushCallback(this)
                .setRequestSerializer(new JsonSerializer()));
        proxyClient.subscribeAndReceiveTtlPackets(chatTopic);
        updateConnect();

    }

    public static void launch(Context context, String nickName) {
        Intent intent = new Intent();
        intent.putExtra("nickName", nickName);
        intent.setClass(context, ChatActivity.class);
        context.startActivity(intent);
    }

    @Override
    public void onBackPressed() {
        android.os.Process.killProcess(android.os.Process.myPid());    //获取PID
        System.exit(0);
    }

    private void updateConnect() {
        String connectState = proxyClient.isConnected() ? "(connected)" : "(disconnected)";
        setTitle("ChatRoom" + connectState);
    }

    @Override
    public void onConnect(String uid) {
        updateConnect();
    }

    @Override
    public void onDisconnect() {
        updateConnect();
    }

    @Override
    public void onPush(String topic, byte[] data) {
        Log.i(TAG, "on push " + topic);
        if (chatTopic.equals(topic)) {
            try {
                Message message = new Gson().fromJson(new String(data, "UTF-8"), Message.class);
                chatMessagesAdapter.addData(message);
                recyclerViewMessages.scrollToPosition(chatMessagesAdapter.getItemCount() - 1);
            } catch (UnsupportedEncodingException e) {
            }
        }
    }


}
