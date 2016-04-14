//
//  Dot.swift
//  misakaDemo
//
//  Created by xuduo on 12/10/15.
//  Copyright © 2015 crazylhf. All rights reserved.
//

import UIKit

public class Dot: NSObject {
    public var xPercent = 0.0;
    public var yPercent = 0.0;
    public var timestamp:Int64 = 0;
    public var myColor:NSNumber = NSNumber(int: 0)
    
    public func getColor() -> UIColor {
        let colorInt = myColor.integerValue
        let mask = 0x000000FF
        let r = Int(colorInt >> 16) & mask
        let g = Int(colorInt >> 8) & mask
        let b = Int(colorInt) & mask
        
        let red   = CGFloat(r) / 255.0
        let green = CGFloat(g) / 255.0
        let blue  = CGFloat(b) / 255.0
        return UIColor(red: red, green: green, blue:blue, alpha: 1.0)
    }
}
