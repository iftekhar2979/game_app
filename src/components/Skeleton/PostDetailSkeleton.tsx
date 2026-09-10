import React from 'react';
import { View } from 'react-native';
import { PostCardSkeleton } from './PostCardSkeleton';
import { Skeleton, SkeletonCircle, SkeletonRegion, SkeletonText } from './Skeleton';

/**
 * One comment, waiting.
 *
 * Mirrors the row in `PostDetailsScreen`: a 36px avatar (28 for a reply),
 * 12px of gutter, a name and timestamp on one line, then the body.
 */
export function CommentSkeleton({ isReply = false }: { isReply?: boolean }) {
  return (
    <View className={`flex-row mb-5 ${isReply ? 'ml-10' : ''}`}>
      <SkeletonCircle size={isReply ? 28 : 36} style={{ marginRight: 12 }} />

      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Skeleton width="38%" height={12} radius={6} />
          <Skeleton width={28} height={9} radius={4} style={{ marginLeft: 8 }} />
        </View>

        <SkeletonText lines={2} lineHeight={11} gap={6} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

/**
 * The post screen before the post arrives.
 *
 * The post itself, then the comments beneath it - because that is the order the
 * reader's eye goes, and a skeleton that only draws the top half implies the
 * page ends there.
 */
export function PostDetailSkeleton() {
  return (
    <SkeletonRegion label="Loading post" style={{ paddingTop: 8 }}>
      <PostCardSkeleton />

      <View className="h-px bg-[#1A1A1A] mx-5 mb-5" />

      <View className="px-5">
        <CommentSkeleton />
        <CommentSkeleton isReply />
        <CommentSkeleton />
      </View>
    </SkeletonRegion>
  );
}

/** The comment list on its own, for when the post is already on screen. */
export function CommentListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonRegion label="Loading comments" style={{ paddingHorizontal: 20, paddingTop: 12 }}>
      {Array.from({ length: Math.max(1, count) }, (_, index) => (
        <CommentSkeleton key={index} isReply={index === 1} />
      ))}
    </SkeletonRegion>
  );
}
