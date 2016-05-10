//
//  StorageUtil.swift
//  misakaDemo
//
//  Created by 蔡阳 on 16/5/4.
//  Copyright © 2016年 crazylhf. All rights reserved.
//

import UIKit

class StorageUtil: NSObject {

    private static let instance = StorageUtil()
    
    private let defaults = NSUserDefaults.standardUserDefaults()
    
    static func sharedInstance() -> StorageUtil{
        return instance
    }
    
    private override init() {
        super.init()
    }
    
    func setItem(item:AnyObject? ,forKey key:String){
        defaults.setObject(item, forKey: key)
        defaults.synchronize()
    }
    
    func getItem(key:String) -> AnyObject?{
        
        return defaults.objectForKey(key)
        
        
    }
    
}
