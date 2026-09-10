import React from 'react';
import { View } from 'react-native';
import { PostCardSkeleton } from './PostCardSkeleton';
import { SkeletonRegion } from './Skeleton';

/**
 * The community feed, waiting.
 *
 * Two cards by default rather than a screenful: past the fold nobody sees them,
 * and every extra block is another animated view on a thread that is already
 * busy fetching. Enough to say "a list of posts is coming", not a rehearsal of
 * the whole page.
 *
 * The first card carries an image and the second does not - a column of
 * identical cards reads as a pattern, which is the moment a skeleton stops
 * looking like content and starts looking like a texture.
 */
export function FeedSkeleton({ count = 2 }: { count?: number }) {
  return (
    <SkeletonRegion label="Loading posts" style={{ paddingTop: 8 }}>
      {Array.from({ length: Math.max(1, count) }, (_, index) => (
        <PostCardSkeleton key={index} withImage={index % 2 === 0} />
      ))}
    </SkeletonRegion>
  );
}

/**
 * The one card appended while the next page loads.
 *
 * Always without an image: this sits at the bottom of a real list, and a 300px
 * placeholder there scrolls the reader away from the post they were reading.
 */
export function FeedFooterSkeleton() {
  return (
    <View style={{ paddingTop: 8 }}>
      <SkeletonRegion label="Loading more posts">
        <PostCardSkeleton withImage={false} />
      </SkeletonRegion>
    </View>
  );
}
