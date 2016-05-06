Android-Push-SDK
=========
Android客户端SDK

###AndroidManifest.xml

```


        <!-- 用户权限设置-->
        <uses-permission android:name="android.permission.INTERNET"/>
        <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
        <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
        <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
        <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
        <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
        <uses-permission android:name="android.permission.WAKE_LOCK" />
        <!-- 华为推送所需权限-->
        <uses-permission android:name="android.permission.READ_PHONE_STATE"/>
        <!-- 小米推送所需权限-->
        <uses-permission android:name="android.permission.GET_TASKS" /><!-- xiaomi -->
        <uses-permission android:name="android.permission.VIBRATE"/><!-- xiaomi -->
        <!-- 以下的两个com.yy.misaka.demo应当换成自己工程的包名-->
        <permission android:name="com.yy.misaka.demo.permission.MIPUSH_RECEIVE" android:protectionLevel="signature" /><!-- xiaomi -->
        <uses-permission android:name="com.yy.misaka.demo.permission.MIPUSH_RECEIVE" /><!-- xiaomi -->

        <!-- 自定义类YYNotificationReceiver,处理通知栏点击事件-->
        <receiver
            android:name=".YYNotificationReceiver"
            android:exported="true" >
            <!-- 这里com.xiaomi.mipushdemo.DemoMessageRreceiver改成app中定义的完整类名 -->
            <intent-filter>
                <action android:name="com.yy.httpproxy.service.RemoteService.INTENT" />
            </intent-filter>
        </receiver>

        <!-- 以下四个服务是在一个远端进程中运行，所以必须设定android:process的值 -->
        <service android:name="com.yy.httpproxy.service.BindService" android:process=":push" android:enabled="true"/>
        <service android:name="com.yy.httpproxy.service.ConnectionService" android:process=":push" android:enabled="true">
            <!-- 以下的APP_ID和APP_KEY应该换成自己项目所申请的小米推送的值 -->
            <meta-data android:name="APP_ID"
                android:value="2882303761517467652" />
            <meta-data android:name="APP_KEY"
                android:value="5981746732652" />
        </service>
        <service android:name="com.yy.httpproxy.service.ForegroundService" android:process=":push" android:enabled="true"/>
        <service android:name="com.yy.httpproxy.service.DummyService" android:process=":push" android:enabled="true"/>

        <!-- 华为相关配置开始-->
        <receiver android:name="com.yy.httpproxy.thirdparty.HuaweiNotificationReceiver" android:process=":push" >
            <intent-filter>
                <!-- 必须,用于接收token-->
                <action android:name="com.huawei.android.push.intent.REGISTRATION" />
                <!-- 必须，用于接收消息-->
                <action android:name="com.huawei.android.push.intent.RECEIVE" />
                <!-- 可选，用于点击通知栏或通知栏上的按钮后触发onEvent回调-->
                <action android:name="com.huawei.android.push.intent.CLICK" />
            </intent-filter>
            <meta-data android:name="CS_cloud_ablitity" android:value="@string/hwpush_ability_value"/>
        </receiver>
        <receiver
            android:name="com.huawei.android.pushagent.PushEventReceiver"
            android:process=":huaweipush" >
            <intent-filter>
                <action android:name="com.huawei.android.push.intent.REFRESH_PUSH_CHANNEL" />
                <action android:name="com.huawei.intent.action.PUSH" />
                <action android:name="com.huawei.intent.action.PUSH_ON" />
                <action android:name="com.huawei.android.push.PLUGIN" />
            </intent-filter>
        </receiver>
        <receiver
            android:name="com.huawei.android.pushagent.PushBootReceiver"
            android:process=":huaweipush" >
            <intent-filter>
                <action android:name="com.huawei.android.push.intent.REGISTER" />
            </intent-filter>
            <meta-data
                android:name="CS_cloud_version"
                android:value="\u0032\u0037\u0030\u0035" />
        </receiver>
        <service
            android:name="com.huawei.android.pushagent.PushService"
            android:process=":huaweipush" >
        </service>
        <!-- 华为相关配置结束-->
        <!-- 小米配置开始-->
        <receiver
            android:exported="true"
            android:name="com.yy.httpproxy.thirdparty.XiaomiNotificationReceiver"
            android:process=":push">
            <intent-filter>
                <action android:name="com.xiaomi.mipush.RECEIVE_MESSAGE" />
            </intent-filter>
            <intent-filter>
                <action android:name="com.xiaomi.mipush.MESSAGE_ARRIVED" />
            </intent-filter>
            <intent-filter>
                <action android:name="com.xiaomi.mipush.ERROR" />
            </intent-filter>
        </receiver>

        <service
            android:enabled="true"
            android:process=":xiaomipush"
            android:name="com.xiaomi.push.service.XMPushService"/>
        <service
            android:enabled="true"
            android:exported="true"
            android:process=":push"
            android:name="com.xiaomi.mipush.sdk.PushMessageHandler" />
        <service android:enabled="true"
            android:process=":push"
            android:name="com.xiaomi.mipush.sdk.MessageHandleService" />
        <!--注：此service必须在2.2.5版本以后（包括2.2.5版本）加入-->
        <receiver
            android:exported="true"
            android:name="com.xiaomi.push.service.receivers.NetworkStatusReceiver" android:process=":push">
        </receiver>
        <receiver
            android:exported="false"
            android:process=":xiaomipush"
            android:name="com.xiaomi.push.service.receivers.PingReceiver" >
            <intent-filter>
                <action android:name="com.xiaomi.push.PING_TIMER" />
            </intent-filter>
        </receiver>
        <!-- 小米配置结束-->

```
###创建ProxyClient
```
    //初始化ProxyClient，其中PUSH_SERVICE_URL为要访问的主机地址，ConnectCallback和PushCallback设置成自己实现的ConnectCallback和PushCallback
    ProxyClient proxyClient = new ProxyClient(new Config(this)
                    .setHost(PUSH_SERVICE_URL)
                    .setConnectCallback(this)
                    .setPushCallback(this)
                    .setRequestSerializer(new JsonSerializer()));
    //在接收消息之前需要绑定相应的topic，这个topic相当于聊天室的标签。
    proxyClient.subscribeAndReceiveTtlPackets(chatTopic);


    //ConnectCallback是获取链接状态的回调接口，实现示例如下：
    new ConnectCallback(){

        @Override
        public void onConnect(String uid) {
            updateConnect();
        }

        @Override
        public void onDisconnect() {
            updateConnect();
        }
    };


    //PushCallback是获取聊天数据的回调接口，实现示例如下（其中topic为接下来要绑定的话题标签，传递和接收聊天信息都通过topic来进行判断，data为传递的聊天信息）：
    new PushCallback(){
        @Override
        public void onPush(String topic, byte[] data) {
            if (chatTopic.equals(topic)) {
                try {
                    Message message = new Gson().fromJson(new String(data, "UTF-8"), Message.class);
                    chatMessagesAdapter.addData(message);
                    recyclerViewMessages.scrollToPosition(chatMessagesAdapter.getItemCount() - 1);
                } catch (UnsupportedEncodingException e) {
                }
            }
        }
    };

```
###发送聊天消息
```
    //发送消息是通过进行http请求来完成的
    Message message = new Message();
    message.setMessage(String.valueOf(editTextInput.getText()));
    message.setNickName(OsVersion.getPhoneVersion());
    message.setColor(myColor);
    httpApiModel.sendMessage(message);
```
###重要类的解释
####ProxyClient
 1. 用途：将对网络的操作进行封装。
    * 包括对网络状态的检查：isConnected()。
    * 对广播的绑定subscribeBroadcast(String topic)，其中topic参数传递消息和接收消息的一个参数，实现消息传递的对应
    * 还有对Push消息的接收。
 2. 注意：
    * 创建时必须设置Config
    * 这个类在Application中只能被创建一次，如果设置在Application初始化中要保证Application只被创建一次，否则服务在远端进程中运行时会再次创建Application，会使ProxyClient被创建两次，从而出现错误。

####Config
 1. 用途：网络连接所需要的配置信息，如host、pushId（随机生成，SharedPreference保存）、ConnectCallback、PushCallback等。
 2. 注意：创建之后最好设置好host的值之后再创建ProxyClient。ConnectCallback、PushCallback等可以后面进行设置。

####ConnectionService
 1. 开启前台服务。
 2. 初始化SocketIO的Socket（通过初始化SocketIOProxyClient）。
 3. 初始化Notification，
 4. 实现检查长链接状态、Push消息接收、消息回应、以及Notification回调接口以供SocketIOProxyClient使用。

####BindService
 处理Config中的RemoteClient发来的广播绑定、设置PUSH_ID、request请求、初始化Messenger、解除广播绑定、解除UID绑定等消息