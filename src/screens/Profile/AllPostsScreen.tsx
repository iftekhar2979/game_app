import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Search, X, Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { ReactionType, useGetFeedQuery, useReactMutation, useDeletePostMutation } from '../../store/api/socialApi';
import { PostCard } from '../../components/Community/PostCard';
import { showToast } from '../../utils/toast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AllPostsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: feedData, isLoading, isFetching, refetch } = useGetFeedQuery({
    mine: true,
    page,
    limit: 10,
  });

  const [react] = useReactMutation();
  const [deletePost] = useDeletePostMutation();
  const [refreshing, setRefreshing] = useState(false);

  const posts = feedData?.posts ?? [];
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter((p) => p.content?.toLowerCase().includes(q));
  }, [posts, searchQuery]);

  const hasMore = feedData?.pagination
    ? page < (feedData.pagination.totalPages || 1)
    : false;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    try {
      await refetch();
    } catch (e) {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleEndReached = () => {
    if (!isFetching && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const handleReact = async (postId: string, type: ReactionType) => {
    try {
      await react({ entityType: 'post', entityId: postId, type }).unwrap();
    } catch (err: any) {
      showToast.error('Could not save reaction', err?.data?.message);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId).unwrap();
      showToast.success('Success', 'Post deleted successfully');
    } catch (err: any) {
      showToast.error('Error', err?.data?.message || 'Could not delete post');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-center px-5 pt-2 pb-4 relative">
        <TouchableOpacity 
          className="absolute left-5 top-2 w-10 h-10 rounded-[12px] border border-white/30 justify-center items-center bg-black/40 z-10"
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-[20px] font-bold mt-2">My Posts</Text>
      </View>

      {/* Search Bar */}
      <View className="px-5 mb-4">
        <View className="flex-row items-center border border-[#333] rounded-[16px] px-3.5 py-2.5 bg-[#121212]">
          <Search color="#666" size={18} className="mr-2" />
          <TextInput 
            className="flex-1 text-white text-[14px] p-0 m-0"
            placeholder="Search my posts..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} className="p-1">
              <X color="#999" size={16} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Posts List */}
      {isLoading && page === 1 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#E0B566" />
          <Text className="text-gray-400 text-xs mt-3">Loading your posts...</Text>
        </View>
      ) : filteredPosts.length === 0 ? (
        <View className="flex-1 justify-center items-center px-8">
          <Text className="text-white text-base font-bold text-center mb-1">
            No Posts Found
          </Text>
          <Text className="text-gray-400 text-xs text-center mb-6">
            {searchQuery
              ? `No posts matching "${searchQuery}".`
              : "You haven't published any community posts yet."}
          </Text>
          <TouchableOpacity
            className="bg-[#8B3DFF] px-5 py-3 rounded-xl flex-row items-center"
            onPress={() => navigation.navigate('CreatePost')}
          >
            <Plus color="#fff" size={18} />
            <Text className="text-white text-sm font-bold ml-1.5">Create New Post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onReact={(type) => handleReact(item.id, type)}
              onOpenComments={() => navigation.navigate('PostDetails', { postId: item.id })}
              onPressImage={() => navigation.navigate('PostDetails', { postId: item.id })}
              onDelete={() => handleDeletePost(item.id)}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8B3DFF"
              colors={['#8B3DFF', '#E0B566']}
              progressBackgroundColor="#121212"
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View className="py-4 items-center justify-center">
                <ActivityIndicator size="small" color="#E0B566" />
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
