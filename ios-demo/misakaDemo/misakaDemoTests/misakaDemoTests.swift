//
//  misakaDemoTests.swift
//  misakaDemoTests
//
//  Created by 蔡阳 on 16/5/10.
//  Copyright © 2016年 crazylhf. All rights reserved.
//

import XCTest
@testable import misakaDemo

class misakaDemoTests: XCTestCase ,PushCallback ,ConnectCallback{
    
    var socketIOClient : SocketIOProxyClient!
    let url = "http://spush.yy.com/api/push?pushAll=true&topic=chatRoom&json=%@&timeToLive="
    let host = "http://spush.yy.com"
    
    
    var chatDic : NSDictionary?
    
    var expectation : XCTestExpectation?
    
    override func setUp() {
        super.setUp()
        // Put setup code here. This method is called before the invocation of each test method in the class.
        
        socketIOClient = SocketIOProxyClient(host: host)
        socketIOClient.pushCallback = self
        socketIOClient.connectCallback = self
        let pushId = PushIdGeneratorBase().generatePushId()
        socketIOClient.setPushId(pushId)
        socketIOClient.subscribeBroadcast("chatRoom",receiveTtl :.Receive)
        
    }
    
    override func tearDown() {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
        super.tearDown()
    }
    
    func testExample() {
        // This is an example of a functional test case.
        // Use XCTAssert and related functions to verify your tests produce the correct results.
//        vc.sendChat("Chat From Test")
        expectation = self.expectationWithDescription("Async request")
        
        self.sendChat("This is a test message")
        self.waitForExpectationsWithTimeout(60, handler: nil)
    }
    
    
    func websocketDidConnect(topic: String, data: NSData?) {
        
    }
    
    func onPush(topic: String, data: NSData?) {
        guard let hasData = data else{
            NSLog("on Push , data equals nil")
            return
        }
        
        var dataDic : NSDictionary?
        do{
            dataDic = try NSJSONSerialization.JSONObjectWithData(hasData, options: .AllowFragments) as? NSDictionary
        }catch _{
            return
        }
        
        XCTAssertNotNil(self.chatDic != nil, "chatDic shouldn't be nil")
        
        XCTAssertNotNil(dataDic, "dataDic shouldn't be nil")
        
        NSLog("\nLogFromTest:\nChatDic:\(self.chatDic!),\nDataDic:\(dataDic!)")
        
        
        XCTAssertTrue(self.chatDic!.isEqualToDictionary(dataDic! as Dictionary<NSObject,AnyObject>), "Equal")
        
        expectation?.fulfill()
    }
    
    func onConnect(uid: String) {
        
        
    }
    
    func onDisconnect() {
        
    }
    func sendChat(msg:String?){
        
        let message = msg == nil ? "" : msg!
        
        
        let chatDic = [
            "nickName" : "Socket-io test",
            "message" : message,
            "color": -16776961
        ]
        
        self.chatDic = chatDic.copy() as? NSDictionary
        
        var jsonData : NSData! = nil
        do{
            
            jsonData = try NSJSONSerialization.dataWithJSONObject(chatDic, options: .PrettyPrinted)
        }catch _{
            return
        }
        
        guard let jsonStr = NSString(data: jsonData, encoding: NSUTF8StringEncoding) else{
            return
        }
        
        let set : NSMutableCharacterSet = NSMutableCharacterSet.alphanumericCharacterSet()
        
        guard let encodedStr = jsonStr.stringByAddingPercentEncodingWithAllowedCharacters(set) else{
            return
        }
        
        let jsonUrl = String(format: url, encodedStr)
        
        guard let reqUrl = NSURL(string: jsonUrl)  else{
            return
        }
        let urlReq = NSURLRequest(URL: reqUrl)
        
        let manager = NSURLSession(configuration: NSURLSessionConfiguration.defaultSessionConfiguration())
        let dataTask = manager.dataTaskWithRequest(urlReq)
        
        dataTask.resume()
    }
    
    
    func testPerformanceExample() {
        // This is an example of a performance test case.
        self.measureBlock {
            // Put the code you want to measure the time of here.
        }
    }
    
}
