/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTUtils.h>
#import <React/RCTTransformAnimatedNode.h>
#import <React/RCTValueAnimatedNode.h>

@implementation RCTTransformAnimatedNode
{
  NSMutableDictionary<NSString *, NSObject *> *_propsDictionary;
}

- (instancetype)initWithTag:(NSNumber *)tag
                     config:(NSDictionary<NSString *, id> *)config
{
  if ((self = [super initWithTag:tag config:config])) {
    _propsDictionary = [NSMutableDictionary new];
  }
  return self;
}

- (NSDictionary *)propsDictionary
{
  return _propsDictionary;
}

- (void)performUpdate
{
  [super performUpdate];

  NSArray<NSDictionary *> *transformConfigs = self.config[@"transforms"];
  NSMutableArray<NSDictionary *> *transform = [NSMutableArray arrayWithCapacity:transformConfigs.count];
  for (NSDictionary *transformConfig in transformConfigs) {
    NSString *type = transformConfig[@"type"];
    NSString *property = transformConfig[@"property"];
    NSNumber *value;
    if ([type isEqualToString: @"animated"]) {
      NSNumber *nodeTag = transformConfig[@"nodeTag"];
      RCTAnimatedNode *node = [self.parentNodes objectForKey:nodeTag];
      if (![node isKindOfClass:[RCTValueAnimatedNode class]]) {
        continue;
      }
      RCTValueAnimatedNode *parentNode = (RCTValueAnimatedNode *)node;
      if(parentNode.animatedObject && [property isEqualToString:@"rotate"]) {
        // We need to convert from string to radians. This is so that we can
        // get comnpatibility with the reanimated library which formats nodes like
        // concat(value, 'deg') or concat(value, 'rad');
        if([parentNode.animatedObject hasSuffix:@"deg"]) {
          CGFloat convertedDegrees = [((NSString*)parentNode.animatedObject) floatValue];
          value = [NSNumber numberWithFloat:convertedDegrees * M_PI / 180];
        } else if([parentNode.animatedObject hasSuffix:@"rad"]) {
          value = [NSNumber numberWithFloat:[((NSString*)parentNode.animatedObject) floatValue]];
        } else {
          RCTFatal(RCTErrorWithMessage([NSString stringWithFormat:@"Error in transform.rotate: %@.", parentNode.animatedObject]));
        }
      } else {
        value = @(parentNode.value);
      }
    } else {
      value = transformConfig[@"value"];
    }
    [transform addObject:@{property: value}];
  }

  _propsDictionary[@"transform"] = transform;
}

@end
