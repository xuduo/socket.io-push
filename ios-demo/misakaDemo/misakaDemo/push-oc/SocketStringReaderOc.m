//
//  SocketStringReaderOc.m
//  ourtimes
//
//  Created by bleach on 16/2/8.
//  Copyright © 2016年 YY. All rights reserved.
//

#import "SocketStringReaderOc.h"

@implementation SocketStringReaderOc

- (BOOL)hasNext {
    return _currentIndex < _message.length;
}

- (NSString*)currentCharacter {
    if (_currentIndex >= _message.length) {
        return @"";
    }
    return [_message substringWithRange:NSMakeRange(_currentIndex, 1)];
}

- (instancetype)initWithMessage:(NSString*)message {
    if (self = [super init]) {
        _message = message;
        _currentIndex = 0;
    }
    return self;
}

- (void)advanceIndexBy:(NSInteger)n {
    _currentIndex += n;
}

- (void)updateIndexBy:(NSInteger)n {
    _currentIndex = n;
}

- (NSString*)read:(NSUInteger)readLength {
    if (_currentIndex >= _message.length) {
        return @"";
    }
    NSUInteger cutLength = _message.length - _currentIndex;
    if (readLength <= cutLength) {
        cutLength = readLength;
    }
    NSString* readString = [_message substringWithRange:NSMakeRange(_currentIndex, cutLength)];
    [self advanceIndexBy:cutLength + 1];
    
    return readString;
}

- (NSString*)readUntilStringOccurence:(NSString*)string {
    NSInteger cutLength = _message.length - _currentIndex;
    if (cutLength <= 0) {
        return @"";
    }
    NSString* substring = [_message substringWithRange:NSMakeRange(_currentIndex, cutLength)];
    NSRange foundRange = [substring rangeOfString:string];
    if (foundRange.location != NSNotFound) {
        _currentIndex += foundRange.location;
        
        return substring;
    }
    
    [self updateIndexBy:_message.length];
    
    if (substring.length == 0) {
        return @"";
    }
    return [substring substringToIndex:substring.length];
}

- (NSString*)readUntilEnd {
    return [self read:_message.length];
}

@end
