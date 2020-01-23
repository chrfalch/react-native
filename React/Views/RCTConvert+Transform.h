/*
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTConvert.h"

@interface RCTConvert (Transform)

+ (CATransform3D)CATransform3D:(id)json;

+ (CGFloat)convertToRadians:(id)json;

@end
