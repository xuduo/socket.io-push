//
//  DrawView.swift
//  misakaDemo
//
//  Created by xuduo on 12/10/15.
//  Copyright © 2015 crazylhf. All rights reserved.
//

import UIKit

public protocol DrawListener {
    
    func addPoint(x:CGFloat,y:CGFloat)
    
    func endLine()
}

public class DrawView: UIView {

    public var dots:[[Dot]] = [[]];
    
    private var lineWidth = CGFloat(2.0)
    
    public var drawListener:DrawListener?


    override public func drawRect(rect: CGRect) {

        
        let context = UIGraphicsGetCurrentContext()
        
        CGContextSetFillColorWithColor(context, UIColor.whiteColor().CGColor);
        CGContextFillRect(context,rect);
        
        CGContextSetLineWidth(context, 5.0)

        
        for line in dots {
            for (index,dot) in line.enumerate() {
                let x = CGFloat(dot.xPercent) * rect.width
                let y = CGFloat(dot.yPercent) * rect.height
               // let cgPoint = CGPointMake(x, y)
               // dot.getColor().setStroke()
                
                CGContextSetStrokeColorWithColor(context,dot.getColor().CGColor)
                
                if(index == 0){
                    CGContextMoveToPoint(context, x, y)
                } else {
                    CGContextAddLineToPoint(context, x, y)
                }
                            }
            CGContextStrokePath(context)
        }

        
    }
    
    private func sendAddDot(x:CGFloat,y:CGFloat){
        let xPercent = x / self.bounds.size.width
        let yPercent = y / self.bounds.size.height
        drawListener?.addPoint(xPercent,y:yPercent)
        print("touchesMoved \(xPercent) \(yPercent)")

    }
    
    override public func touchesBegan(touches: Set<UITouch>, withEvent event: UIEvent?) {
        if let touch = touches.first as UITouch! {
            let currentPoint = touch.locationInView(self)
            sendAddDot(currentPoint.x, y:currentPoint.y)
        }
        print("touchesBegan")
    }
    
    override public func touchesMoved(touches: Set<UITouch>, withEvent event: UIEvent?) {
        if let touch = touches.first as UITouch! {
            let currentPoint = touch.locationInView(self)
            sendAddDot(currentPoint.x, y:currentPoint.y)
            print("\(currentPoint.x) \(currentPoint.y)")
        }
//        var last:UITouch
//        var i = 0
//        for touch in touches {
//            last = touch
//            
//            print("touch \(i++) \(touch)")
//        }
//        if(last != nil) {
//            let currentPoint = last.locationInView(self)
//            sendAddDot(currentPoint.x, y:currentPoint.y)
//        }
    }
    
    public override func touchesEnded(touches: Set<UITouch>, withEvent event: UIEvent?) {
        drawListener?.endLine()
        print("touchesEnded")
    }
    
    
}
