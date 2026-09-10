import React from 'react';
import { View } from 'react-native';
import { Skeleton, SkeletonCircle, SkeletonRegion } from './Skeleton';

/**
 * The wait while the stored session is read back.
 *
 * Deliberately *not* a home-screen skeleton. At this point the app does not yet
 * know whether the reader is signed in, so drawing a feed would promise a page
 * that half the time turns into a sign-in form - and a skeleton that resolves
 * into something else is a worse lie than no skeleton at all.
 *
 * So: the shape common to wherever this lands - a mark, a title, a subtitle -
 * shimmering on the app's own black.
 */
export function AppBootSkeleton() {
  return (
    <View className="flex-1 bg-black justify-center items-center">
      <SkeletonRegion label="Starting up" style={{ alignItems: 'center' }}>
        <SkeletonCircle size={96} />
        <Skeleton width={148} height={16} radius={8} style={{ marginTop: 28 }} />
        <Skeleton width={96} height={11} radius={5} style={{ marginTop: 12 }} />
      </SkeletonRegion>
    </View>
  );
}
