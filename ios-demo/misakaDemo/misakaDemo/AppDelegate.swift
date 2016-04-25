//
//  AppDelegate.swift
//  misakaDemo
//
//  Created by crazylhf on 15/10/26.
//  Copyright © 2015年 crazylhf. All rights reserved.
//

import UIKit


@UIApplicationMain
public class AppDelegate: UIResponder, UIApplicationDelegate {
    
    public var window: UIWindow?
    public var socketIOClient:SocketIOProxyClient!
   // public var socketIOClientOc:SocketIOProxyClientOC!
    
    public func application(application: UIApplication, didFinishLaunchingWithOptions launchOptions: [NSObject: AnyObject]?) -> Bool {
        let url = "http://spush.yy.com";
        
        socketIOClient = SocketIOProxyClient.init(host: url)
        
       // socketIOClientOc = SocketIOProxyClientOC.initWith(url);
        
        
        // Register for push in iOS 8
        if #available(iOS 8.0, *) {
            let settings = UIUserNotificationSettings(forTypes: [.Alert, .Badge, .Sound], categories: nil)
            UIApplication.sharedApplication().registerUserNotificationSettings(settings)
            UIApplication.sharedApplication().registerForRemoteNotifications()
        } else {
            UIApplication.sharedApplication().registerForRemoteNotificationTypes([.Alert, .Badge, .Sound])
        }
        
        
        
        return true
    }
    
    public func applicationWillResignActive(application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and throttle down OpenGL ES frame rates. Games should use this method to pause the game.
    }
    
    public func applicationDidEnterBackground(application: UIApplication) {
        
        self.socketIOClient.keepInBackground()
    }
    
    var taskId:UIBackgroundTaskIdentifier?
    
    func doUpdate () {
        
        dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), {
            
            self.taskId = self.beginBackgroundUpdateTask()
            
            print(" application.backgroundTimeRemaining %d",UIApplication.sharedApplication().backgroundTimeRemaining)
            
        })
    }
    
    func beginBackgroundUpdateTask() -> UIBackgroundTaskIdentifier {
        return UIApplication.sharedApplication().beginBackgroundTaskWithExpirationHandler({})
    }
    
    func endBackgroundUpdateTask(taskID: UIBackgroundTaskIdentifier) {
        UIApplication.sharedApplication().endBackgroundTask(taskID)
    }
    
    public func applicationWillEnterForeground(application: UIApplication) {
        //  self.endBackgroundUpdateTask(self.taskId!)
        // Called as part of the transition from the background to the inactive state; here you can undo many of the changes made on entering the background.
    }
    
    public func applicationDidBecomeActive(application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }
    
    public func applicationWillTerminate(application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }
    
    public func application(application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: NSData) {
        let tokenChars = UnsafePointer<CChar>(deviceToken.bytes)
        var tokenString = ""
        
        for var i = 0; i < deviceToken.length; i++ {
            tokenString += String(format: "%02.2hhx", arguments: [tokenChars[i]])
        }
        print("app token \(tokenString)")
        self.socketIOClient.onApnToken(tokenString)
    }
    
    public func application(application: UIApplication, didReceiveRemoteNotification userInfo: [NSObject : AnyObject], fetchCompletionHandler completionHandler: (UIBackgroundFetchResult) -> Void) {
        print("1")
    }
    
    public func application(application: UIApplication, didReceiveLocalNotification notification: UILocalNotification) {
        print("2")
    }
    
    public func application(application: UIApplication, handleActionWithIdentifier identifier: String?, forRemoteNotification userInfo: [NSObject : AnyObject], withResponseInfo responseInfo: [NSObject : AnyObject], completionHandler: () -> Void) {
        print("3")
    }
    
}

