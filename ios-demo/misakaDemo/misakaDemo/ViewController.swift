//
//  ViewController.swift
//  misakaDemo
//
//  Created by crazylhf on 15/10/26.
//  Copyright © 2015年 crazylhf. All rights reserved.
//

import UIKit

class ViewController: UIViewController,ConnectCallback,PushCallback/*,PushCallbackDelegate*/{
    
    let url = "http://spush.yy.com/api/push?pushAll=true&topic=chatRoom&json=%@&timeToLive="
    
    private var socketIOClient:SocketIOProxyClient!
    private var socketIOClientOc:SocketIOProxyClientOC!
    private var lastTimestamp = NSDate()
    
    @IBOutlet weak var textFieldBottomConstraint: NSLayoutConstraint!
    @IBOutlet weak var chatTextField: UITextField!
    @IBOutlet weak var chatTableView: UITableView!
    weak var tapView : UIView?
    let reuseId = "chatContentCell"
    
    var userName : String!
    
    private var chats : [ChatInfo]!
    
    
    
    //MARK: - Life Cycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        
        
        socketIOClient = (UIApplication.sharedApplication().delegate as! AppDelegate).socketIOClient
        socketIOClient.pushCallback = self
        socketIOClient.connectCallback = self
        let pushId = PushIdGeneratorBase().generatePushId()
        socketIOClient.setPushId(pushId)
        socketIOClient.subscribeBroadcast("chatRoom",receiveTtl :.Receive)
        
        
        
        self.chatTableView.separatorColor = UIColor.clearColor()
        
        if #available(iOS 8.0, *) {
            let userNameInputAlert = UIAlertController(title: "用户名", message: "userName", preferredStyle: .Alert)
            
            
            userNameInputAlert.addTextFieldWithConfigurationHandler({ [unowned self](textField) in
                textField.placeholder = "Input user name"
                textField.delegate = self
                })
            
            let ok = UIAlertAction(title: "ok", style: .Default, handler: { [unowned self] (action) in
                self.userName = userNameInputAlert.textFields?[0].text
                NSLog("\(userNameInputAlert.textFields![0].text)")
                })
            
            userNameInputAlert.addAction(ok)
            self.presentViewController(userNameInputAlert, animated: true, completion: nil)
        } else {
            // Fallback on earlier versions
            let userNameInputAlert = UIAlertView(title: "用户名", message: "userName", delegate: self, cancelButtonTitle: "ok")
            userNameInputAlert.alertViewStyle = .PlainTextInput
            userNameInputAlert.textFieldAtIndex(0)?.delegate = self
            userNameInputAlert.show()
        }
        
        self.registerKeyboardNotifications()
        self.addTapView()
        
    }
    
    deinit{
        NSNotificationCenter.defaultCenter().removeObserver(self)
    }
    
    override func viewDidLayoutSubviews() {
        self.tapView?.frame = self.chatTableView.frame
    }
    
    
    //MARK: - Socket Callbacks
    func websocketDidConnect(topic : String, data : NSData?){
        
    }
    
//    func loge(level: String, format: String, args:va_list) {
//        print("oc client log " + format,args);
//    }
    
    func onPushOc(topic: String!, nsstring: String!) {
        print("onPushOc %@ %@",topic,nsstring);
    }
    
    func onConnect(uid:String){
        //        latencyText.text = "connected"
        self.navigationItem.title = "connected"
    }
    
    func onDisconnect() {
        //        latencyText.text = "disconnected"
        self.navigationItem.title = "disconnected"
    }
    
    func onPush(topic: String, data: NSData?) {
        
        //        print("ViewController %@ %@",topic, String(data:data!, encoding: NSUTF8StringEncoding));
        
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
        
        self.parseChatDic(dataDic)
        
    }
    
    //MARK: - Helpers
    
    @IBAction func onClear(sender: AnyObject) {
        socketIOClient.request("/clear",data:nil)
        lastTimestamp = NSDate()
    }
    
    func registerKeyboardNotifications(){
        NSNotificationCenter.defaultCenter().addObserver(self, selector: #selector(keyboardWillChange), name: UIKeyboardWillChangeFrameNotification, object: nil)
        NSNotificationCenter.defaultCenter().addObserver(self, selector: #selector(keyboardWillHide), name: UIKeyboardWillHideNotification, object: nil)
        
    }
    
    
    func sendChat(msg:String?){
        
        let message = msg == nil ? "" : msg!
        
        
        let chatDic = [
            "nickName" : self.userName,
            "message" : message,
            "color": -16776961
        ]
        
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
    
    
    func parseChatDic(dic:NSDictionary?){
        if let dataDic = dic{
            
            
            let chatInfo = ChatInfo()
            chatInfo.nickName = dataDic["nickName"] as? String
            chatInfo.message = dataDic["message"] as? String
            chatInfo.color = (dataDic["color"] as? NSNumber)!.integerValue
            NSLog("\(chatInfo.message)")
            if chats == nil {
                chats = [ChatInfo]()
            }
            
            let idx = NSIndexPath(forRow: chats.count, inSection: 0)
            chats.append(chatInfo)
            self.chatTableView.insertRowsAtIndexPaths([idx], withRowAnimation: .Fade)
            self.chatTableView.scrollToRowAtIndexPath(idx, atScrollPosition: .Bottom, animated: true)
        }
    }
    
    func addTapView(){
        if self.tapView == nil {
            let view = UIView()
            self.view.addSubview(view)
            self.tapView = view
            
            let tap = UITapGestureRecognizer(target: self, action: #selector(hideKeyboard))
            self.tapView?.addGestureRecognizer(tap)
        }
    }
    
    func hideKeyboard(){
        self.chatTextField.resignFirstResponder()
    }
    
    
}


//MARK: - TableView Data Source
extension ViewController:UITableViewDataSource{
    
    
    func numberOfSectionsInTableView(tableView: UITableView) -> Int {
        return 1
    }
    
    func tableView(tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return chats == nil ?  0 :chats!.count
    }
    
    func tableView(tableView: UITableView, cellForRowAtIndexPath indexPath: NSIndexPath) -> UITableViewCell {
        var cell : UITableViewCell! = tableView.dequeueReusableCellWithIdentifier(reuseId)
        if cell == nil {
            cell = UITableViewCell(style: .Default , reuseIdentifier: reuseId)
        }
        
        let chat = chats[indexPath.row]
        cell.textLabel?.text = chat.nickName + ":" + chat.message
        
        
        return cell
    }
}

//MARK: -TableView Delegate
extension ViewController:UITableViewDelegate{
    
    func tableView(tableView: UITableView, didSelectRowAtIndexPath indexPath: NSIndexPath) {
        tableView.deselectRowAtIndexPath(indexPath, animated: true)
    }
}


//MARK: - UITextField Delegate

extension ViewController:UITextFieldDelegate{
    func textFieldShouldReturn(textField: UITextField) -> Bool {
        
        if textField == self.chatTextField{
            
            sendChat(textField.text)
            
            textField.text = ""
        }
            
        else{
            if textField.text == nil || textField.text == "" {
                return false
            }
            self.userName = textField.text
        }
        
        //        textField.resignFirstResponder()
        return true
    }
    
}



//MARK: - Notification Callbacks

extension ViewController{
    func keyboardWillChange(noti:NSNotification){
        
        if !self.chatTextField.isFirstResponder(){
            return
        }
        if let height = (noti.userInfo?[UIKeyboardFrameEndUserInfoKey] as? NSValue)?.CGRectValue().height{
            if height > 0 {
                self.tapView?.hidden = false
            }
            self.textFieldBottomConstraint.constant = height
            self.chatTextField.setNeedsLayout()
            var idx = -1
            if self.chats != nil && self.chats.count > 0 {
                idx = self.chats.count - 1
            }
            UIView.animateWithDuration(0.25){
                [unowned self] in
                self.view.layoutIfNeeded()
                if idx  >= 0{
                    let index = NSIndexPath(forRow: idx, inSection: 0)
                    
                    self.chatTableView.scrollToRowAtIndexPath(index, atScrollPosition: .Bottom, animated: true)
                }
                
            }
            
        }
    }
    
    func keyboardWillHide(noti:NSNotification){
        self.tapView?.hidden = true
        UIView.animateWithDuration(0.25){
            [unowned self] in
            self.textFieldBottomConstraint.constant = 0
            self.view.layoutIfNeeded()
            
        }
    }
}
