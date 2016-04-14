//
//  PushIdGeneratorBaseOc.h
//  ourtimes
//
//  Created by bleach on 16/2/6.
//  Copyright © 2016年 YY. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface PushIdGeneratorBaseOc : NSObject

+ (NSString*)randomAlphaNumeric:(NSInteger)count;
+ (NSString*)generatePushId;

@end
