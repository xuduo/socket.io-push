//
//  SocketStringReaderOc.h
//  ourtimes
//
//  Created by bleach on 16/2/8.
//  Copyright © 2016年 YY. All rights reserved.
//

#import <Foundation/Foundation.h>

@interface SocketStringReaderOc : NSObject

- (instancetype)initWithMessage:(NSString*)message;

@property (nonatomic, strong) NSString* message;
@property (nonatomic, assign) NSUInteger currentIndex;

- (BOOL)hasNext;
- (NSString*)currentCharacter;
- (NSString*)read:(NSUInteger)readLength;
- (NSString*)readUntilStringOccurence:(NSString*)string;
- (NSString*)readUntilEnd;

@end
