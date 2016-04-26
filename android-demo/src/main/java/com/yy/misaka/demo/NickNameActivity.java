package com.yy.misaka.demo;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.EditText;
import android.widget.Toast;

public class NickNameActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_nick);
        init();
    }

    private void init() {
        final EditText etNickName = (EditText) findViewById(R.id.et_nick_nickname);
        findViewById(R.id.btn_nick_enter).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String nickname = String.valueOf(etNickName.getText()).trim();
                if (nickname.equals("")) {
                    Toast.makeText(NickNameActivity.this, "Nickname can't be null", Toast.LENGTH_SHORT).show();
                } else {
                    ChatActivity.launch(NickNameActivity.this, nickname);
                }
            }
        });
    }

    public static void launch(Context context) {
        Intent intent = new Intent();
        intent.setClass(context, NickNameActivity.class);
        context.startActivity(intent);
    }
}
