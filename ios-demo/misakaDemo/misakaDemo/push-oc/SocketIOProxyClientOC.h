//
//  SocketIOProxyClientOC.h
//  ourtimes
//
//  Created by bleach on 16/2/8.
//  Copyright © 2016年 YY. All rights reserved.
//

#import <Foundation/Foundation.h>

@protocol PushCallbackDelegate <NSObject>

@optional

- (void)log:(NSString*)level format:(NSString*)format args:(va_list)args;
- (void)onPushOc:(NSString*)topic nsdata:(NSData*)nsdata;

@end

@interface SocketIOProxyClientOC : NSObject

@property(weak, nonatomic) id<PushCallbackDelegate> pushCallbackDelegate;
@property(strong, nonatomic) NSString* pushId;

+ (instancetype)initWith:(NSString *)url;
- (void)onApnToken:(NSString *)deviceToken;
- (void)subscribeBroadcast:(NSString *)topic;
- (void)subscribeBroadcast:(NSString *)topic receiveTtlPackets:(BOOL)receiveTtlPackets;
- (void)unsubscribeBroadcast:(NSString *)topic;
- (void)keepInBackground;
- (void)request:(NSString*)path data:(NSData*)data;

@end
