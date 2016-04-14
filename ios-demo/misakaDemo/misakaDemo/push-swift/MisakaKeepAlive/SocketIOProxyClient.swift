//
//  SocketIOProxyClient.swift
//  MisakaKeepAlive
//
//  Created by crazylhf on 15/10/26.
//  Copyright © 2015年 crazylhf. All rights reserved.
//

import Foundation
import UIKit


public class SocketIOProxyClient : NSObject {

    public var pushCallback:PushCallback?
    public var connectCallback:ConnectCallback?
    private var socket:SocketIOClient?
    private var pushId:String?
    private var apnToken:String?
    private var connected = false
    private var broadcastTopics = NSMutableSet()

    public init(host:String){
        super.init();
        let https = host.containsString("https://")
        socket = SocketIOClient(socketURL: host, options: [.Log(true), .ForceWebsockets(true), .Secure(https), .SelfSigned(https),  .ForceNew(true), .ReconnectWait(5)])

        socket!.on("connect") {data, ack in
            print("socket connect ")
            self.connected = true
            self.sendPushIdAndTopicToServer()
            self.sendApnTokenToServer()
        }
        
        socket!.on("pushId") {data, ack in
            print("socket pushId ")
            self.connected = true
            self.connectCallback?.onConnect()
        }

        socket!.on("disconnect") {data, ack in
            print("socket disconnect")
            self.connected = false
            self.connectCallback?.onDisconnect()
        }
        
        socket!.on("error") {data, ack in
            print("socket error")
            self.connected = false
            self.connectCallback?.onDisconnect()
        }

        socket!.on("push") {data, ack in
            var aDictionary = data[0] as! Dictionary<String, AnyObject>
            
            let topic = aDictionary["topic"] as? String
            let dataBase64 = aDictionary["data"] as? String
            
            if( aDictionary["reply"] != nil){
                let data = NSMutableDictionary()
                self.socket!.emit("pushReply", data)
            }
            
            if (nil != self.pushCallback) {
                if(nil != dataBase64) {
                    let nsdata = NSData(base64EncodedString: dataBase64!, options: NSDataBase64DecodingOptions(rawValue: 0))
                    self.pushCallback?.onPush(topic!, data: nsdata)
                } else {
                    self.pushCallback?.onPush(topic!, data: nil)
                }
            }
        }
        
        socket!.connect()
    }
    
    public func keepInBackground() {
        dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), {
            
            UIApplication.sharedApplication().beginBackgroundTaskWithExpirationHandler({})
            
            print("SocketIOProxyClient begin background task \(UIApplication.sharedApplication().backgroundTimeRemaining)")
            
        })
    }
    
    public func request(path:String,data:NSData?) {
        
        if let base64DataStr = data?.base64EncodedStringWithOptions(NSDataBase64EncodingOptions(rawValue: 0)) {
            self.socket!.emit("packetProxy", ["data": base64DataStr,"path":path,"sequenceId":PushIdGeneratorBase.randomAlphaNumeric(32)])
        } else {
            self.socket!.emit("packetProxy", ["path":path,"sequenceId":PushIdGeneratorBase.randomAlphaNumeric(32)])
        }
        
    }
    
    public func onApnToken(token:String){
        apnToken = token
        sendApnTokenToServer()
    }
    
    public func subscribeBroadcast(topic:String){
        broadcastTopics.addObject(topic)
        if (connected) {
            self.socket!.emit("subscribeTopic", ["topic": topic])
        }
    }
    
    public func unsubscribeBroadcast(topic:String){
        broadcastTopics.removeObject(topic)
        if (connected) {
            self.socket!.emit("unsubscribeTopic", ["topic": topic])
        }
    }
    
    private func sendApnTokenToServer() {
        if (pushId != nil && apnToken != nil && connected) {
            let data = NSMutableDictionary()
            data.setValue(apnToken, forKey: "apnToken")
            data.setValue(pushId, forKey: "pushId")
            data.setValue(NSBundle.mainBundle().bundleIdentifier, forKey: "bundleId")
            self.socket!.emit("apnToken", data)
            print("send apnToken \(apnToken)")
        }
    }
    
    private func sendPushIdAndTopicToServer() {
        if (pushId != nil && connected) {
            let data = NSMutableDictionary()
            data.setValue(pushId, forKey: "id")
            data.setValue(1, forKey: "version")
            data.setValue("ios", forKey: "platform")
            if(broadcastTopics.count > 0){
                data.setValue(broadcastTopics.allObjects as NSArray, forKey: "topics")
            }
            self.socket!.emit("pushId", data)
        }
    }
    
    public func setPushId(pushId: String){
        self.pushId = pushId
        self.sendPushIdAndTopicToServer()
    }
    
        

}