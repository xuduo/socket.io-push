//
//  PushIdGeneratorBaseOc.m
//  ourtimes
//
//  Created by bleach on 16/2/6.
//  Copyright © 2016年 YY. All rights reserved.
//

#import "PushIdGeneratorBaseOc.h"

@implementation PushIdGeneratorBaseOc

+ (NSString*)randomAlphaNumeric:(NSInteger)count {
    NSMutableString* randomStr = [[NSMutableString alloc] initWithCapacity:count];
    
    while (count-- >= 0) {
        [randomStr appendString:[PushIdGeneratorBaseOc oneRandomAlphaNumeric]];
    }
    return randomStr;
}

+ (NSString*)oneRandomAlphaNumeric {
    unichar randomVal = arc4random() % 5;
    if (0 == randomVal || 2 == randomVal || 4 == randomVal) {
        randomVal = 97 + (arc4random() % 26);
        return [NSString stringWithCharacters:&randomVal length:1];
    } else {
        randomVal = 48 + (arc4random() % 10);
        return [NSString stringWithCharacters:&randomVal length:1];
    }
}

+ (NSString*)generatePushId {
    NSString* strPushID = [[NSUserDefaults standardUserDefaults] objectForKey:@"SharedPreferencePushGenerator"];
    if (nil == strPushID) {
        strPushID = [PushIdGeneratorBaseOc randomAlphaNumeric:32];
        [[NSUserDefaults standardUserDefaults] setObject:strPushID forKey:@"SharedPreferencePushGenerator"];
    }
    return strPushID;
}

@end
