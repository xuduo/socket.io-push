//
//  SocketPacketOc.h
//  ourtimes
//
//  Created by FanChunxing on 16/2/8.
//  Copyright © 2016年 YY. All rights reserved.
//

#import <Foundation/Foundation.h>

typedef NS_ENUM(NSInteger, PacketFrameType)
{
    UnKnown = -1,
    Open,
    Close,
    Ping,
    Pong,
    Message,
    Upgrade,
    Noop
};

typedef NS_ENUM(NSInteger, PacketType)
{
    Connect,
    Disconnect,
    Event,
    Ack,
    Error,
    BinaryEvent,
    BinaryAck
};

@interface SocketPacketOc : NSObject

@property(nonatomic) NSInteger placeholders;
@property(nonatomic) NSInteger currentPlace;

@property(strong, nonatomic) NSString* logType;// = "SocketPacket"

@property(strong, nonatomic) NSString* nsp;
@property(nonatomic) NSInteger id;
@property(nonatomic) PacketType type;

@property(strong, nonatomic) NSMutableData* binary;
@property(strong, nonatomic) id data;

@property(strong, nonatomic) id args;


+ (SocketPacketOc *)packetFromEmit:(id)items
                                Id:(NSInteger)Id
                               nsp:(NSString *)nsp
                               ack:(BOOL)ack;

- (NSString *)packetString;

@end
