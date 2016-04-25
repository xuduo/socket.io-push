//
//  ViewController.swift
//  misakaDemo
//
//  Created by crazylhf on 15/10/26.
//  Copyright © 2015年 crazylhf. All rights reserved.
//

import UIKit

class ViewController: UIViewController,ConnectCallback,PushCallback,DrawListener,PushCallbackDelegate {
    
    private var socketIOClient:SocketIOProxyClient!
    private var socketIOClientOc:SocketIOProxyClientOC!
    private var lastTimestamp = NSDate()
    
    @IBOutlet weak var drawView: DrawView!
    @IBOutlet weak var latencyText: UITextView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        drawView.drawListener = self
        
        socketIOClient = (UIApplication.sharedApplication().delegate as! AppDelegate).socketIOClient
    //    socketIOClientOc = (UIApplication.sharedApplication().delegate as! AppDelegate).socketIOClientOc
     //   socketIOClientOc.pushCallbackDelegate = self;
      //  let pushIdOc = socketIOClientOc.pushId;
  //      print("pushIdOc " + pushIdOc);
        latencyText.text = "disconnected"
        socketIOClient.pushCallback = self
        socketIOClient.connectCallback = self
        let pushId = PushIdGeneratorBase.init().generatePushId;
        socketIOClient.setPushId(pushId())
        socketIOClient.subscribeBroadcast("/addDot")
        socketIOClient.subscribeBroadcast("/endLine")
        socketIOClient.subscribeBroadcast("/clear")

    }
    
    
    func addPoint(x: CGFloat, y: CGFloat) {
        
        let dictionary = ["xPercent": x, "yPercent": y, "myColor":-65536]
        do {
            let jsonData = try NSJSONSerialization.dataWithJSONObject(dictionary, options: NSJSONWritingOptions.PrettyPrinted)
            socketIOClient.request("/addDot", data:jsonData)
        } catch let error as NSError {
            print(error)
        }
    }
    
    func endLine() {
        socketIOClient.request("/endLine",data:nil)
    }
    func websocketDidConnect(topic : String, data : NSData?){
        
    }

    func log(level: String!, format: String!, args: CVaListPointer) {
       print("oc client log " + format,args);
    }
    
    func onPushOc(topic: String!, nsstring: String!) {
        print("onPushOc %@ %@",topic,nsstring);
    }
    
    @IBAction func onClear(sender: AnyObject) {
        socketIOClient.request("/clear",data:nil)
        lastTimestamp = NSDate()
    }
    
    
    func onPush(topic: String, data: NSData?) {
        
        print("ViewController %@ %@",topic, String(data:data!, encoding: NSUTF8StringEncoding));
        
        if ("/addDot" == topic) {
            do {
                let dot = Dot()
                let json = try NSJSONSerialization.JSONObjectWithData(data!, options: .AllowFragments)
                dot.xPercent = json["xPercent"] as! Double
                dot.yPercent = json["yPercent"] as! Double
                dot.myColor = json["myColor"] as! NSNumber
                drawView.dots[drawView.dots.count - 1].append(dot);
                
            } catch {
                print("error serializing JSON: \(error)")
            }
        } else if ("/endLine" == topic) {
            drawView.dots.append([])
        } else if ("/clear" == topic) {
         //   let latency = (NSDate().timeIntervalSince1970  - lastTimestamp.timeIntervalSince1970 ) * 1000
          //  latencyText.text = "\(latency)ms"
            drawView.dots.removeAll()
            drawView.dots.append([])
        }
        drawView.setNeedsDisplay()
    }
    
    func onConnect(uid:String){
        latencyText.text = "connected"
    }

    func onDisconnect() {
        latencyText.text = "disconnected"
    }
}

