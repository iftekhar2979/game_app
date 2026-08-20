import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronLeft, MessageSquareOff, PlusSquare, RotateCcw } from 'lucide-react-native';
import { RootStackParamList } from '../../../App';
import CustomLoader from '../../components/Loader/CustomLoader';
import { PostCard } from '../../components/Community/PostCard';
import {
  CommunityPost,
  ReactionType,
  useDeletePostMutation,
  useGetFeedQuery,
  useReactMutation,
} from '../../store/api/socialApi';
import { showToast } from '../../utils/toast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const PAGE_SIZE = 10;

export default function CommunityFeedScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [page, setPage] = useState(1);
  // The shuffle seed doubles as the feed's pool anchor, so it is minted by the
  // server - never here. A device clock that disagrees with the server's would
  // anchor the pool in the past and filter the whole feed away. Page 1 sends no
  // seed (the server mints a fresh one, which reshuffles); later pages echo the
  // one it returned, which holds the ordering steady while scrolling.
  const [seed, setSeed] = useState<number | undefined>(undefined);

  const { data, isLoading, isFetching, isError, error, refetch } = useGetFeedQuery({
    page,
    limit: PAGE_SIZE,
    seed: page === 1 ? undefined : seed,
  });

  useEffect(() => {
    if (data?.seed) setSeed(data.seed);
  }, [data?.seed]);

  const [react] = useReactMutation();
  const [deletePost] = useDeletePostMutation();

  const posts = data?.posts ?? [];
  const hasMore = Boolean(data?.pagination?.nextPage);

  // Page 1 carries no seed, so refetching it makes the server mint a new one
  // and the feed comes back reshuffled.
  const handleRefresh = useCallback(() => {
    if (page === 1) {
      refetch();
    } else {
      setPage(1);
    }
  }, [page, refetch]);

  const handleEndReached = useCallback(() => {
    if (!isFetching && hasMore) setPage((current) => current + 1);
  }, [isFetching, hasMore]);

  const handleReact = useCallback(
    async (post: CommunityPost, type: ReactionType) => {
      try {
        await react({ entityType: 'post', entityId: post.id, type }).unwrap();
      } catch (err: any) {
        showToast.error('Could not save your reaction', err?.data?.message);
      }
    },
    [react],
  );

  const handleDelete = useCallback(
    async (post: CommunityPost) => {
      try {
        await deletePost(post.id).unwrap();
        showToast.success('Post deleted');
      } catch (err: any) {
        showToast.error('Could not delete the post', err?.data?.message);
      }
    },
    [deletePost],
  );

  const renderEmpty = () => {
    if (isLoading) return null;

    if (isError) {
      return (
        <View className="items-center px-10 py-20">
          <Text className="text-white text-[16px] font-semibold text-center">
            We could not load the community feed
          </Text>
          <Text className="text-gray-500 text-[13px] text-center mt-2">
            {(error as any)?.data?.message || 'Check your connection and try again.'}
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
            className="flex-row items-center mt-5 px-4 py-2.5 rounded-2xl bg-[#8B3DFF]"
          >
            <RotateCcw color="#fff" size={16} />
            <Text className="text-white font-bold text-[13px] ml-2">Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View className="items-center px-10 py-20">
        <MessageSquareOff color="#3f3f46" size={40} />
        <Text className="text-white text-[16px] font-semibold text-center mt-4">
          Nothing here yet
        </Text>
        <Text className="text-gray-500 text-[13px] text-center mt-2">
          Be the first to share something with the community.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreatePost')}
          className="mt-5 px-4 py-2.5 rounded-2xl bg-[#8B3DFF]"
        >
          <Text className="text-white font-bold text-[13px]">Create a post</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0a0a0a]" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-5 pt-2 pb-5">
        <TouchableOpacity
          className="w-10 h-10 rounded-xl border border-[#333] justify-center items-center mr-3"
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-[20px] font-bold">Community</Text>
      </View>

      {isLoading && posts.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <CustomLoader size={40} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(post) => post.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onReact={(type) => handleReact(item, type)}
              onOpenComments={() => navigation.navigate('PostDetails', { postId: item.id })}
              onDelete={() => handleDelete(item)}
              onPressImage={() => navigation.navigate('PostDetails', { postId: item.id })}
            />
          )}
          contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && page === 1}
              onRefresh={handleRefresh}
              tintColor="#E0B566"
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View className="py-6 items-center">
                <CustomLoader size={26} />
              </View>
            ) : null
          }
        />
      )}

      <TouchableOpacity
        className="absolute bottom-8 right-5 w-[60px] h-[60px] rounded-[18px] bg-[#8B3DFF] justify-center items-center"
        style={{
          shadowColor: '#8B3DFF',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 5,
        }}
        onPress={() => navigation.navigate('CreatePost')}
        accessibilityLabel="Create a post"
        accessibilityRole="button"
      >
        <PlusSquare color="#fff" size={24} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
