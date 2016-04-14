//
//  PushIdGeneratorBase.swift
//  MisakaKeepAlive
//
//  Created by crazylhf on 15/10/26.
//  Copyright © 2015年 crazylhf. All rights reserved.
//

import Foundation

public class PushIdGeneratorBase : NSObject  {
    
    public static func randomAlphaNumeric(var count:Int) -> String
    {
        var randomStr = "";
        while (count-- >= 0) {
            randomStr = randomStr + String(self.oneRandomAlphaNumeric());
        }
        return randomStr;
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
        var strPushID : String? = NSUserDefaults.standardUserDefaults().objectForKey("SharedPreferencePushGenerator") as? String
        if (nil == strPushID) {
            strPushID = PushIdGeneratorBase.randomAlphaNumeric(32);
            NSUserDefaults.standardUserDefaults().setObject(strPushID!, forKey: "SharedPreferencePushGenerator")
        }
        return strPushID!;
    }
}
