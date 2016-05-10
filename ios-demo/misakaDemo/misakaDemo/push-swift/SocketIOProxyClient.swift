//
//  SocketIOProxyClient.swift
//  MisakaKeepAlive
//
//  Created by crazylhf on 15/10/26.
//  Copyright © 2015年 crazylhf. All rights reserved.
//

import Foundation
import UIKit

@objc public protocol PushCallback {
    func websocketDidConnect(topic : String, data : NSData?)
    func onPush(topic : String, data : NSData?)
//    func loge(level:String,format:String,args:va_list)
}

@objc public protocol ConnectCallback {
    func onConnect(uid:String)
    func onDisconnect()
}

@objc public protocol PushIdCallback {
    func onPushId(pushId : String)
}

@objc public protocol PushSerializer {
    func serialize(topic:String,data : NSData)
}

@objc public protocol PushHandler {
    func onPush(topic:String, data : AnyObject)
}


public enum TTLReceiveType : Int{
    case Receive = 1
    case DoNotReceive = 0
}

public class SocketIOProxyClient : NSObject {
    
    private let lastUnicastId = "lastUnicastId"
    
    public var pushCallback:PushCallback?
    public var connectCallback:ConnectCallback?
    private var socket:SocketIOClient?
    private var pushId:String?
    private var apnToken:String?
    private var connected = false
//    private var broadcastTopics = NSMutableSet()
    private var broadcastTopicsMap = Dictionary<String ,TTLReceiveType>()
    private var topicToLastPacketId = Dictionary<String ,String>()
    
    public init(host:String){
        super.init();
        let https = host.containsString("https://")
        socket = SocketIOClient(socketURL: host, options: [.Log(true), .ForceWebsockets(true), .Secure(https), .SelfSigned(https),  .ForceNew(true), .ReconnectWait(3)])
        
        socket!.on("connect") {
            [unowned self]
            data, ack in
            print("socket connect ")
            self.connected = true
            self.sendPushIdAndTopicToServer()
        }
        
        socket!.on("pushId") {
            [unowned self]
            data, ack in
            print("socket pushId ")
            self.connected = true
            var values = data[0] as! Dictionary<String, AnyObject>
            var uid = values["uid"] as? String
            if(uid == nil){
                uid = "";
            }
            self.connectCallback?.onConnect(uid!)
            self.sendApnTokenToServer()
        }
        
        socket!.on("disconnect") {
            [unowned self]
            data, ack in
            print("socket disconnect")
            self.connected = false
            self.connectCallback?.onDisconnect()
        }
        
        socket!.on("error") {
            [unowned self]
            data, ack in
            print("socket error")
            self.connected = false
            self.connectCallback?.onDisconnect()
        }
        
        socket!.on("push") {
            [unowned self]
            data, ack in
            self.handlePush(data, ack: ack)
        }
        socket!.on("p"){
            [unowned self]
            data, ack in
            self.handlePush(data, ack: ack)
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
    
    public func unbindUid() {
         self.socket!.emit("unbindUid")
    }
    
    public func onApnToken(token:String){
        apnToken = token
        sendApnTokenToServer()
    }
    
    public func subscribeBroadcast(topic:String ,receiveTtl:TTLReceiveType){
//        broadcastTopics.addObject(topic)
        broadcastTopicsMap[topic] = receiveTtl
        if (connected) {
            self.socket!.emit("subscribeTopic", ["topic": topic])
        }
    }
    
    public func unsubscribeBroadcast(topic:String){
//        broadcastTopics.removeObject(topic)
        broadcastTopicsMap.removeValueForKey(topic)
        if (connected) {
            self.socket!.emit("unsubscribeTopic", ["topic": topic])
        }
    }
    
    private func sendApnTokenToServer() {
        if (pushId != nil && apnToken != nil && connected) {
            let data = NSMutableDictionary()
            data.setValue(apnToken, forKey: "apnToken")
            data.setValue(pushId, forKey: "pushId")
            data.setValue("apn", forKey: "type")
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
            if(broadcastTopicsMap.count > 0){
                data.setValue(Array(broadcastTopicsMap.keys), forKey: "topics")
            }
            self.socket!.emit("pushId", data)
        }
    }
    
    public func setPushId(pushId: String){
        self.pushId = pushId
        self.sendPushIdAndTopicToServer()
    }
    
    private func handlePush(data:[AnyObject] ,ack:SocketAckEmitter){
        var values = data[0] as! Dictionary<String, AnyObject>
        
        var topic = values["t"] as? String
        if(topic == nil){
            topic = values["topic"] as? String
        }
        var binary = NSData();
        var dataBase64 = values["data"] as? String
        if( dataBase64 == nil){
            dataBase64 = values["d"] as? String
        }
        if(dataBase64 != nil){
            binary = NSData(base64EncodedString: dataBase64!, options: NSDataBase64DecodingOptions(rawValue: 0))!;
        } else {
            let json = values["j"];
            if( json != nil){
                do {
                    binary = try NSJSONSerialization.dataWithJSONObject(json!, options: NSJSONWritingOptions.init(rawValue: 0))
                } catch let myJSONError {
                    print("parse json error %s", myJSONError)
                    return;
                }
            }
        }
        
        
        updateLastPacketId(topic!, data: data)
        
        if (nil != self.pushCallback) {
            self.pushCallback?.onPush(topic!, data: binary)
        }
    }
    
    
    func updateLastPacketId(topic:String! ,data:[AnyObject]){
        guard let values = data[0] as? Dictionary<String, AnyObject>
            else{
                return
        }
        let id : String! = values["id"] as? String ?? values["i"] as? String
      
        let ttl : String! = values["ttl"] as? String ?? values["t"] as? String
        
        let unicast : String! = values["unicast"] as? String ?? values["u"] as? String
        
        if(id != nil && ttl != nil){
            if unicast != nil{
                StorageUtil.sharedInstance().setItem(id, forKey: lastUnicastId)
            }else if topic != nil && broadcastTopicsMap[topic] != nil && broadcastTopicsMap[topic] == .Receive{
                topicToLastPacketId[topic] = id
            }
        }
        
    }
    
}