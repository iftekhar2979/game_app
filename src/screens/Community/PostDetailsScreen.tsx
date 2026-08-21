import React, { useCallback, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, CornerDownRight, Send, Trash2, X } from 'lucide-react-native';
import { RootStackParamList } from '../../../App';
import { RootState } from '../../store';
import CustomLoader from '../../components/Loader/CustomLoader';
import Avatar from '../../components/common/Avatar';
import { PostCard, timeAgo } from '../../components/Community/PostCard';
import { ReactionBar } from '../../components/Community/ReactionBar';
import {
  CommunityComment,
  ReactionType,
  useCreateCommentMutation,
  useDeleteCommentMutation,
  useDeletePostMutation,
  useGetCommentsQuery,
  useGetPostQuery,
  useReactMutation,
} from '../../store/api/socialApi';
import { showToast } from '../../utils/toast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ScreenRoute = RouteProp<RootStackParamList, 'PostDetails'>;

interface ReplyTarget {
  id: string;
  authorName: string;
}

/** One comment plus its eagerly-loaded replies. */
const CommentRow = ({
  comment,
  currentUserId,
  onReact,
  onReply,
  onDelete,
  isReply,
}: {
  comment: CommunityComment;
  currentUserId?: string;
  onReact: (comment: CommunityComment, type: ReactionType) => void;
  onReply: (comment: CommunityComment) => void;
  onDelete: (comment: CommunityComment) => void;
  isReply?: boolean;
}) => {
  const author = comment.author;
  const isMine =
    currentUserId &&
    String((author as any)?.id || (author as any)?._id || comment.authorId) === String(currentUserId);

  return (
    <View className={`flex-row mb-5 ${isReply ? 'ml-10' : ''}`}>
      <Avatar
        uri={author?.avatarUrl}
        name={author?.fullName}
        size={isReply ? 28 : 36}
        style={{ marginRight: 12 }}
      />

      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-[13px] font-semibold" numberOfLines={1}>
            {author?.fullName || 'Community member'}
          </Text>
          <Text className="text-gray-500 text-[10px] ml-2">{timeAgo(comment.createdAt)}</Text>
        </View>

        <Text className="text-gray-300 text-[13px] leading-5 mt-1">{comment.content}</Text>

        {comment.isFlagged && (
          <Text className="text-amber-400 text-[11px] mt-1">
            Under review — only you can see this.
          </Text>
        )}

        <View className="flex-row items-center mt-2">
          <ReactionBar
            counts={comment.reactionCounts}
            myReaction={comment.myReaction}
            onReact={(type) => onReact(comment, type)}
            compact
          />

          {!isReply && (
            <TouchableOpacity
              className="flex-row items-center ml-5"
              onPress={() => onReply(comment)}
              accessibilityLabel="Reply to this comment"
              accessibilityRole="button"
            >
              <CornerDownRight color="#666" size={13} />
              <Text className="text-gray-500 text-[12px] ml-1.5">Reply</Text>
            </TouchableOpacity>
          )}

          {isMine && (
            <TouchableOpacity
              className="ml-5"
              onPress={() => onDelete(comment)}
              accessibilityLabel="Delete this comment"
              accessibilityRole="button"
            >
              <Trash2 color="#666" size={13} />
            </TouchableOpacity>
          )}
        </View>

        {comment.replies?.map((reply) => (
          <View key={reply.id} className="mt-4">
            <CommentRow
              comment={reply}
              currentUserId={currentUserId}
              onReact={onReact}
              onReply={onReply}
              onDelete={onDelete}
              isReply
            />
          </View>
        ))}

        {!isReply && comment.repliesCount > (comment.replies?.length ?? 0) && (
          <Text className="text-gray-600 text-[11px] mt-2">
            {comment.repliesCount - (comment.replies?.length ?? 0)} more replies
          </Text>
        )}
      </View>
    </View>
  );
};

export default function PostDetailsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { postId } = useRoute<ScreenRoute>().params;

  const [draft, setDraft] = useState('');
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

  // Drives the "delete my own comment" affordance, using the same auth shape
  // the rest of the app reads.
  const currentUserId = useSelector(
    (state: RootState) => (state.auth?.user as any)?._id || (state.auth?.user as any)?.id,
  );

  const { data: post, isLoading: isLoadingPost, isError: isPostError } = useGetPostQuery(postId);
  const {
    data: commentsData,
    isLoading: isLoadingComments,
    isFetching: isFetchingComments,
  } = useGetCommentsQuery({ postId });

  const [react] = useReactMutation();
  const [createComment, { isLoading: isPosting }] = useCreateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const [deletePost] = useDeletePostMutation();

  const comments = commentsData?.comments ?? [];

  const handleReactToPost = useCallback(
    async (type: ReactionType) => {
      try {
        await react({ entityType: 'post', entityId: postId, type }).unwrap();
      } catch (err: any) {
        showToast.error('Could not save your reaction', err?.data?.message);
      }
    },
    [react, postId],
  );

  const handleReactToComment = useCallback(
    async (comment: CommunityComment, type: ReactionType) => {
      try {
        await react({ entityType: 'comment', entityId: comment.id, type, postId }).unwrap();
      } catch (err: any) {
        showToast.error('Could not save your reaction', err?.data?.message);
      }
    },
    [react, postId],
  );

  const handleSubmitComment = useCallback(async () => {
    const content = draft.trim();
    if (!content) return;

    try {
      const created = await createComment({
        postId,
        content,
        ...(replyTarget ? { parentId: replyTarget.id } : {}),
      }).unwrap();

      setDraft('');
      setReplyTarget(null);

      if (created.isFlagged) {
        showToast.warning(
          'Comment under review',
          'Our filters flagged this, so only you can see it for now.',
        );
      }
    } catch (err: any) {
      showToast.error('Could not post your comment', err?.data?.message);
    }
  }, [draft, replyTarget, createComment, postId]);

  const handleDeleteComment = useCallback(
    async (comment: CommunityComment) => {
      try {
        await deleteComment({ commentId: comment.id, postId }).unwrap();
        showToast.success('Comment deleted');
      } catch (err: any) {
        showToast.error('Could not delete the comment', err?.data?.message);
      }
    },
    [deleteComment, postId],
  );

  const handleDeletePost = useCallback(async () => {
    try {
      await deletePost(postId).unwrap();
      showToast.success('Post deleted');
      navigation.goBack();
    } catch (err: any) {
      showToast.error('Could not delete the post', err?.data?.message);
    }
  }, [deletePost, postId, navigation]);

  if (isLoadingPost) {
    return (
      <SafeAreaView className="flex-1 bg-[#0a0a0a] justify-center items-center">
        <CustomLoader size={40} />
      </SafeAreaView>
    );
  }

  if (isPostError || !post) {
    return (
      <SafeAreaView className="flex-1 bg-[#0a0a0a]" edges={['top', 'bottom']}>
        <View className="flex-row items-center px-5 pt-2 pb-5">
          <TouchableOpacity
            className="w-10 h-10 rounded-xl border border-[#333] justify-center items-center mr-3"
            onPress={() => navigation.goBack()}
          >
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
        </View>
        <View className="flex-1 justify-center items-center px-10">
          <Text className="text-white text-[16px] font-semibold text-center">
            This post is no longer available
          </Text>
          <Text className="text-gray-500 text-[13px] text-center mt-2">
            It may have been deleted or removed by a moderator.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0a0a0a]" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity
          className="w-10 h-10 rounded-xl border border-[#333] justify-center items-center mr-3"
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-[20px] font-bold">Post</Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <FlatList
          data={comments}
          keyExtractor={(comment) => comment.id}
          ListHeaderComponent={
            <View>
              <PostCard
                post={post}
                onReact={handleReactToPost}
                onOpenComments={() => {}}
                onDelete={handleDeletePost}
              />
              <View className="px-5 pb-3 border-b border-[#1f1f1f]">
                <Text className="text-white text-[15px] font-semibold">
                  {post.commentsCount} {post.commentsCount === 1 ? 'comment' : 'comments'}
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View className="px-5 pt-5">
              <CommentRow
                comment={item}
                currentUserId={currentUserId}
                onReact={handleReactToComment}
                onReply={(comment) =>
                  setReplyTarget({
                    id: comment.id,
                    authorName: comment.author?.fullName || 'this comment',
                  })
                }
                onDelete={handleDeleteComment}
              />
            </View>
          )}
          ListEmptyComponent={
            isLoadingComments || isFetchingComments ? (
              <View className="py-10 items-center">
                <CustomLoader size={26} />
              </View>
            ) : (
              <View className="py-10 items-center px-10">
                <Text className="text-gray-500 text-[13px] text-center">
                  No comments yet. Start the conversation.
                </Text>
              </View>
            )
          }
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        <View className="px-5 pt-2 pb-3 border-t border-[#1f1f1f]">
          {replyTarget && (
            <View className="flex-row items-center justify-between mb-2 px-1">
              <Text className="text-gray-400 text-[12px] flex-1" numberOfLines={1}>
                Replying to {replyTarget.authorName}
              </Text>
              <TouchableOpacity
                onPress={() => setReplyTarget(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Cancel reply"
                accessibilityRole="button"
              >
                <X color="#666" size={15} />
              </TouchableOpacity>
            </View>
          )}

          <View className="flex-row items-center border border-[#333] rounded-full px-5">
            <TextInput
              className="text-white text-[14px] h-[46px] flex-1"
              placeholder={replyTarget ? 'Write a reply…' : 'Add your comment'}
              placeholderTextColor="#666"
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={handleSubmitComment}
              returnKeyType="send"
              maxLength={2000}
              editable={!isPosting}
            />
            {draft.trim().length > 0 && (
              <TouchableOpacity
                onPress={handleSubmitComment}
                disabled={isPosting}
                className="ml-2"
                accessibilityLabel="Send comment"
                accessibilityRole="button"
              >
                {isPosting ? (
                  <CustomLoader size={18} color="#8B3DFF" strokeWidth={2} />
                ) : (
                  <Send color="#8B3DFF" size={18} />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
