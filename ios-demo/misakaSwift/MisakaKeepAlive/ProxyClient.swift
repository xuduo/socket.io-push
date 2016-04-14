//
//  ProxyClient.swift
//  MisakaKeepAlive
//
//  Created by crazylhf on 15/10/26.
//  Copyright © 2015年 crazylhf. All rights reserved.
//

import Foundation

@objc public protocol PushCallback {
    func websocketDidConnect(topic : String, data : NSData?)
    func onPush(topic : String, data : NSData?)
}

@objc public protocol ConnectCallback {
    func onConnect()
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

public class ProxyClient : NSObject, PushCallback {
    
    public static func test(){
        
        let socket = SocketIOClient(socketURL: "183.61.6.33:80", options: [.Log(true), .ForceWebsockets(true)])
        
        socket.on("connect") {data, ack in
            print("socket connected")
        }
        
        socket.on("currentAmount") {data, ack in
            if let cur = data[0] as? Double {
                socket.emitWithAck("canUpdate", cur)(timeoutAfter: 0) {data in
                    socket.emit("update", ["amount": cur + 2.50])
                }
                
                ack.with("Got your currentAmount", "dude")
            }
        }
        
        socket.connect()
    }
    
    public func websocketDidConnect(topic: String, data: NSData?) {
    }
    
    public func onPush(topic: String, data: NSData?) {
        if (nil != data) {
            print("ProxyClient - onPush, topic : \(topic), data : \(NSString(data: data!, encoding: NSUTF8StringEncoding)))")
        } else {
            print("ProxyClient - onPush, topic : \(topic), data : \(data))")
        }
    }
    
}