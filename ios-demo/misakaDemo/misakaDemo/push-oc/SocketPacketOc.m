//
//  SocketPacketOc.m
//  ourtimes
//
//  Created by FanChunxing on 16/2/8.
//  Copyright © 2016年 YY. All rights reserved.
//

#import "SocketPacketOc.h"

@implementation SocketPacketOc

- (id)getArgs
{
    NSMutableArray* arr = _data;
    
    if (arr.count == 0) {
        return nil;
    } else {
        if (_type == Event || _type == BinaryEvent) {
            [arr removeObjectAtIndex:0];
            return arr;
        } else {
            return arr;
        }
    }
}

- (NSString *)description
{
    return [NSString stringWithFormat:@"SocketPacket {type:%lu;data:%@;id:%lu;placeholders:%lu;nsp:%@}", _type, _data, _id, _placeholders, _nsp];
}

- (NSString *)event
{
    return _data[0];
}


- (NSString *)packetString
{
    return [self createPacketString];
}

- (instancetype)init
{
    self = [super init];
    self.data = nil;
    self.id = -1;
    self.nsp = nil;
    self.type = Event;
    self.placeholders = 0;
    self.binary = [NSMutableData data];
    
    return self;
}

- (BOOL)addData:(NSData *)data
{
    if (_placeholders == _currentPlace) {
        return YES;
    }
    
    [_binary appendData:data];
    _currentPlace++;
    
    if (_placeholders == _currentPlace) {
        _currentPlace = 0;
        return YES;
    } else {
        return YES;
    }
}


- (NSString *)completeMessage:(NSMutableString *)message ack:(BOOL)ack
{
    if ([_data count] == 0) {
        return [NSMutableString stringWithFormat:@"%@]", message];
    }
    
    for (id arg in _data) {
        if ([arg isKindOfClass:[NSDictionary class]]) {
                NSData* jsonSend = [NSJSONSerialization dataWithJSONObject:arg options:NSJSONWritingPrettyPrinted error:nil];
            NSString* jsonString = [[NSString alloc] initWithData:jsonSend encoding:NSUTF8StringEncoding];
            
            message = [NSMutableString stringWithFormat:@"%@%@,", message, [jsonString stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]]];
        }
        else if ([arg isKindOfClass:[NSString class]]) {
            NSMutableString* str = [NSMutableString stringWithString:arg];
            [str replaceOccurrencesOfString:@"\n"
                                 withString:@"\\\\n"
                                    options:NSCaseInsensitiveSearch
                                      range:NSMakeRange(0, str.length)];
            [str replaceOccurrencesOfString:@"\r"
                                 withString:@"\\\\r"
                                    options:NSCaseInsensitiveSearch
                                      range:NSMakeRange(0, str.length)];
            
            // May be wrong.
            message = [NSMutableString stringWithFormat:@"%@\"%@\",", message, str];
        }
        else if (!arg) {
            message = [NSMutableString stringWithFormat:@"%@null,", message];
        } else {
            message = [NSMutableString stringWithFormat:@"%@%@,", message, arg];
        }
    }
    
    if (message.length) {
        // May be wrong.
        [message replaceCharactersInRange:NSMakeRange(message.length - 1, 1) withString:@""];
    }
    
    return [NSString stringWithFormat:@"%@]", message];
}


- (NSString *)createAck
{
    NSMutableString* msg;
    
    if (_type == Ack) {
        if ([_nsp isEqualToString:@"/"]) {
            msg = [NSMutableString stringWithFormat:@"3%lu[", _id];//"3\(id)["
        } else {
            msg = [NSMutableString stringWithFormat:@"3%@,%lu[", _nsp, _id];//"3\(nsp),\(id)["
        }
    } else {
        if ([_nsp isEqualToString:@"/"]) {
            msg = [NSMutableString stringWithFormat:@"6%lu-%lu[", [_binary length], _id];//"6\(binary.count)-\(id)["
        } else {
            msg = [NSMutableString stringWithFormat:@"6%lu-%@,%lu[", [_binary length], _nsp, _id];//"6\(binary.count)-\(nsp),\(id)["
        }
    }
    
    return [self completeMessage:msg ack:YES];
}



- (NSString *)createMessageForEvent
{
    NSMutableString* message;
    
    if (_type == Event) {
        if ([_nsp isEqualToString:@"/"]) {
            if (_id == -1) {
                message = @"2[".mutableCopy;
            } else {
                message = [NSMutableString stringWithFormat:@"2%lu[", _id];//"2\(id)["
            }
        } else {
            if (_id == -1) {
                message = [NSMutableString stringWithFormat:@"2%@,[", _nsp];//"2\(nsp),["
            } else {
                message = [NSMutableString stringWithFormat:@"2%@,%lu[", _nsp, _id];//"2\(nsp),\(id)["
            }
        }
    } else {
        if ([_nsp isEqualToString:@"/"]) {
            if (_id == -1) {
                message = [NSMutableString stringWithFormat:@"5%lu-[", _binary.length];//"5\(binary.count)-["
            } else {
                message = [NSMutableString stringWithFormat:@"5%lu-%lu[", _binary.length, _id];//"5\(binary.count)-\(id)["
            }
        } else {
            if (_id == -1) {
                message = [NSMutableString stringWithFormat:@"5%lu-%@,[", _binary.length, _nsp];//"5\(binary.count)-\(nsp),["
            } else {
                message = [NSMutableString stringWithFormat:@"5%lu-%@,%lu[", _binary.length, _nsp, _id];//"5\(binary.count)-\(nsp),\(id)["
            }
        }
    }
    
    return [self completeMessage:message ack:YES];
}


- (NSString *)createPacketString
{
    NSString* str;
    
    if (_type == Event || _type == BinaryEvent) {
        str = [self createMessageForEvent];
    } else {
        str = [self createAck];
    }
    
    return str;
}

- (void)fillInPlaceholders {
    NSMutableArray* data = _data;
    for (NSUInteger i = 0; i < data.count; ++i) {
        NSString* str = (NSString *)data[i];
        if (str) {
            NSString* regex = @"~~(\\d)";
            NSError *error;
            NSRegularExpression *regular = [NSRegularExpression regularExpressionWithPattern:regex
                                                                                     options:NSRegularExpressionCaseInsensitive
                                                                                       error:&error];
            NSArray* num = [regular matchesInString:str
                                               options:NSMatchingWithTransparentBounds
                                                 range:NSMakeRange(0, str.length)];
            // May be wrong.
            data[i] = [_binary subdataWithRange:NSMakeRange([num[1] integerValue], _binary.length - [num[1] integerValue])];
        }
        else if ([data[i] isKindOfClass:[NSDictionary class]] || [data[i] isKindOfClass:[NSArray class]]) {
            data[i] = [self _fillInPlaceholders:data[i]];
        }
    }
}


- (id)_fillInPlaceholders:(id)data {
    if ([data isKindOfClass:[NSString class]]) {
        NSString* str = data;
        
        NSString* regex = @"~~(\\d)";
        NSError *error;
        NSRegularExpression *regular = [NSRegularExpression regularExpressionWithPattern:regex
                                                                                 options:NSRegularExpressionCaseInsensitive
                                                                                   error:&error];
        NSArray* num = [regular matchesInString:str
                                        options:NSMatchingWithTransparentBounds
                                          range:NSMakeRange(0, str.length)];
        if (num) {
            return [_binary subdataWithRange:NSMakeRange([num[1] integerValue], _binary.length - [num[1] integerValue])];
        } else {
            return str;
        }
    } else if ([data isKindOfClass:[NSDictionary class]]) {
        NSDictionary* dict = data;
        NSMutableDictionary* newDict = dict.mutableCopy;
        
        for (id key in dict.allKeys) {
            newDict[key] = [self _fillInPlaceholders:dict[key]];
        }
        
        return newDict;
    } else if ([data isKindOfClass:[NSArray class]]) {
        NSArray* arr = data;
        NSMutableArray* newArr = arr.mutableCopy;
        
        NSUInteger index = 0;
        for (id obj in arr) {
            newArr[index] = [self _fillInPlaceholders:obj];
            ++index;
        }
        
        return newArr;
    } else {
        return data;
    }
}

+ (PacketType)findType:(NSInteger)binCount ack:(BOOL)ack
{
    switch (binCount) {
        case 0: {
            if (!ack) {
                return Event;
            }
            else {
                return Ack;
            }
            break;
        }
        default: {
            if (!ack) {
                return BinaryEvent;
            }
            else {
                return BinaryAck;
            }
            break;
        }
    }
    
    return Error;
}

+ (SocketPacketOc *)packetFromEmit:(id)items
                              Id:(NSInteger)Id
                             nsp:(NSString *)nsp
                             ack:(BOOL)ack
{
    id parseData;
    NSData* binary;
    NSDictionary* deconstructData = [self deconstructData:items];
    parseData = deconstructData[@"parseData"];
    binary = deconstructData[@"binary"];
    SocketPacketOc* packet = [SocketPacketOc new];
    packet.type = [self findType:binary.length ack:ack];
    packet.data = parseData;
    packet.id = Id;
    packet.nsp = nsp;
    packet.placeholders = -1;
    packet.binary = binary.mutableCopy;
    
    return packet;
}
+ (NSDictionary *)deconstructData:(NSArray *)data
{
    NSMutableArray* mData = data.mutableCopy;
    NSMutableData* binary = [NSMutableData data];
    
    for (NSUInteger i = 0; i < mData.count; ++i) {
        mData[i] = [self shred:mData[i] binary:binary];
    }
    
    return @{@"parseData":mData, @"binary":binary};
}

+ (id)shred:(id)data
     binary:(NSMutableData *)binary
{
    if ([data isKindOfClass:[NSData class]]) {
        NSData* bin = data;
        NSDictionary* placeholder = @{@"_placeholder":@(YES), @"num":@(binary.length)};
        [binary appendData:bin];
        return placeholder;
    }
    else if ([data isKindOfClass:[NSArray class]]) {
        NSMutableArray* arr = ((NSArray *)data).mutableCopy;
        for (NSUInteger i = 0; i < arr.count; ++i) {
            arr[i] = [self shred:arr[i] binary:binary];
        }
        return arr;
    }
    else if ([data isKindOfClass:[NSDictionary class]]) {
        NSDictionary* dict = data;
        NSMutableDictionary* mutDict = dict.mutableCopy;
        
        for (id key in dict.allKeys) {
            mutDict[key] = [self shred:dict[key] binary:binary];
        }
        
        return mutDict;
    }
    else {
        return data;
    }
}

@end
