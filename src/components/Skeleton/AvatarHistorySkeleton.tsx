import React from 'react';
import { Dimensions, View } from 'react-native';
import { Skeleton, SkeletonRegion } from './Skeleton';

// The same numbers `AvatarHistoryScreen` lays out with, so the real preview
// lands where its placeholder was instead of jolting the page.
const MAIN_PREVIEW_HEIGHT = Math.min(560, Dimensions.get('window').height * 0.68);
const STRIP_PREVIEW_HEIGHT = 132;

/**
 * My avatars, waiting.
 *
 * The tall preview dominates this screen, and it is the slowest thing on it -
 * a layered render over several fetched images - so it is the one placeholder
 * that genuinely earns its space. The strip beneath says a row of saved avatars
 * follows, which is the part a returning user is actually looking for.
 */
export function AvatarHistorySkeleton() {
  return (
    <SkeletonRegion label="Loading your avatars">
      <View className="px-5">
        <Skeleton width="100%" height={MAIN_PREVIEW_HEIGHT} radius={24} />
      </View>

      {/* The "in use" pill and the two round actions beside it. */}
      <View className="flex-row items-center justify-center mt-4 px-5">
        <Skeleton width={132} height={36} radius={18} />
        <Skeleton width={40} height={40} radius={20} style={{ marginLeft: 12 }} />
        <Skeleton width={40} height={40} radius={20} style={{ marginLeft: 8 }} />
      </View>

      <View className="px-5 pt-6">
        <Skeleton width="42%" height={14} radius={7} />

        <View className="flex-row mt-3">
          {[0, 1, 2].map((index) => (
            <Skeleton
              key={index}
              width={92}
              height={STRIP_PREVIEW_HEIGHT}
              radius={18}
              style={index === 0 ? undefined : { marginLeft: 12 }}
            />
          ))}
        </View>
      </View>
    </SkeletonRegion>
  );
}
