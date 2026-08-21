import React from 'react';
import { Dimensions, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { AlertTriangle, MessageSquare, Trash2 } from 'lucide-react-native';
import { CommunityPost, ReactionType } from '../../store/api/socialApi';
import { ReactionBar } from './ReactionBar';
import Avatar from '../common/Avatar';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface PostCardProps {
  post: CommunityPost;
  onReact: (type: ReactionType) => void;
  onOpenComments: () => void;
  onDelete?: () => void;
  onPressImage?: (index: number) => void;
}

/** "3h", "2d" — matches the compact timestamps used elsewhere in the app. */
export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

/**
 * A single feed card. Multiple images are shown as a horizontal pager so a
 * gallery post never pushes the rest of the feed off screen.
 */
export const PostCard = ({
  post,
  onReact,
  onOpenComments,
  onDelete,
  onPressImage,
}: PostCardProps) => {
  const author = post.author;
  const images = post.imageUrls || [];
  const imageWidth = SCREEN_WIDTH - 40;

  return (
    <View className="px-5 mb-8">
      {/* Author */}
      <View className="flex-row items-center mb-3">
        <Avatar
          uri={author?.avatarUrl}
          name={author?.fullName}
          size={36}
          style={{ marginRight: 12 }}
        />
        <View className="flex-1 justify-center">
          <Text className="text-white text-[15px] font-semibold" numberOfLines={1}>
            {author?.fullName || 'Community member'}
          </Text>
          <Text className="text-[#E0B566] text-[13px] mt-0.5">{timeAgo(post.createdAt)}</Text>
        </View>

        {post.isMine && onDelete && (
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Delete this post"
            accessibilityRole="button"
          >
            <Trash2 color="#666" size={18} />
          </TouchableOpacity>
        )}
      </View>

      {/*
        Flagged posts only ever reach their own author - the feed hides them from
        everyone else - so this banner explains the absence rather than shaming.
      */}
      {post.isFlagged && (
        <View className="flex-row items-center bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 mb-3">
          <AlertTriangle color="#f59e0b" size={14} />
          <Text className="text-amber-400 text-[12px] ml-2 flex-1">
            Under review — only you can see this post right now.
          </Text>
        </View>
      )}

      {!!post.content && (
        <Text className="text-white text-[15px] mb-4">{post.content}</Text>
      )}

      {images.length === 1 && (
        <TouchableOpacity activeOpacity={0.9} onPress={() => onPressImage?.(0)}>
          <Image
            source={{ uri: images[0] }}
            className="w-full h-[300px] rounded-2xl bg-[#222]"
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {images.length > 1 && (
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={imageWidth + 8}
            decelerationRate="fast"
          >
            {images.map((uri, index) => (
              <TouchableOpacity
                key={`${uri}-${index}`}
                activeOpacity={0.9}
                onPress={() => onPressImage?.(index)}
                style={{ width: imageWidth, marginRight: index === images.length - 1 ? 0 : 8 }}
              >
                <Image
                  source={{ uri }}
                  className="w-full h-[300px] rounded-2xl bg-[#222]"
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text className="text-gray-500 text-[11px] mt-2 text-right">
            {images.length} photos
          </Text>
        </View>
      )}

      {/* Footer */}
      <View className="flex-row justify-between items-center mt-4">
        <ReactionBar counts={post.reactionCounts} myReaction={post.myReaction} onReact={onReact} />

        <TouchableOpacity
          className="flex-row items-center"
          onPress={onOpenComments}
          accessibilityLabel={`View ${post.commentsCount} comments`}
          accessibilityRole="button"
        >
          <Text className="text-[#ccc] text-[13px] mr-2">
            {post.commentsCount} {post.commentsCount === 1 ? 'Comment' : 'Comments'}
          </Text>
          <MessageSquare color="#999" size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
};
