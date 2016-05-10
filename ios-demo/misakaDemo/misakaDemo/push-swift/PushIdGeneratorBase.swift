//
//  PushIdGeneratorBase.swift
//  MisakaKeepAlive
//
//  Created by crazylhf on 15/10/26.
//  Copyright © 2015年 crazylhf. All rights reserved.
//

import Foundation

public class PushIdGeneratorBase : NSObject  {
    
    
    private let pushGeneratorKey = "SharedPreferencePushGenerator"
    
    public static func randomAlphaNumeric(count:Int) -> String
    {
        var cnt = count
        var randomStr = "";
        while (cnt >= 0) {
            cnt = cnt - 1
            randomStr = randomStr + String(self.oneRandomAlphaNumeric());
        }
        return randomStr
    }
    
    public static func oneRandomAlphaNumeric() -> Character {
        let randomVal = arc4random() % 5;
        if (0 == randomVal || 2 == randomVal || 4 == randomVal) {
            return Character(UnicodeScalar(97 + (arc4random() % 26)));
        } else {
            return Character(UnicodeScalar(48 + (arc4random() % 10)));
        }
    }
    
    
    public func generatePushId() -> String {
        
        var strPushID = StorageUtil.sharedInstance().getItem(pushGeneratorKey) as? String
        if (nil == strPushID) {
            strPushID = PushIdGeneratorBase.randomAlphaNumeric(32);
            StorageUtil.sharedInstance().setItem(strPushID, forKey: pushGeneratorKey)
        }
        return strPushID!;
    }
}
