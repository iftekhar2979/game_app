import React from 'react';
import { View } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonText } from './Skeleton';

/**
 * A feed card with the content taken out.
 *
 * Deliberately the same measurements as `PostCard` - 36px author avatar, 20px
 * of gutter, a 300px image, the same margins - so the real card lands on top of
 * its own outline instead of shoving the page around. A skeleton whose shape is
 * only roughly right is worse than a spinner: it promises a layout and then
 * breaks it.
 *
 * @param withImage most posts carry one; passing false gives the text-only
 * shape, so a screen that knows better does not flash an image slot that never
 * fills.
 */
export function PostCardSkeleton({ withImage = true }: { withImage?: boolean }) {
  return (
    <View className="px-5 mb-8">
      <View className="flex-row items-center mb-3">
        <SkeletonCircle size={36} style={{ marginRight: 12 }} />

        <View className="flex-1 justify-center">
          {/* Name, then the shorter timestamp beneath it. */}
          <Skeleton width="45%" height={13} radius={6} />
          <Skeleton width="22%" height={11} radius={5} style={{ marginTop: 6 }} />
        </View>
      </View>

      <SkeletonText lines={2} lineHeight={13} gap={8} style={{ marginBottom: 16 }} />

      {withImage && <Skeleton width="100%" height={300} radius={16} />}

      {/* The reaction row: three pills of unequal width, as the real one is. */}
      <View className="flex-row mt-4">
        <Skeleton width={64} height={28} radius={14} />
        <Skeleton width={52} height={28} radius={14} style={{ marginLeft: 10 }} />
        <Skeleton width={76} height={28} radius={14} style={{ marginLeft: 10 }} />
      </View>
    </View>
  );
}
