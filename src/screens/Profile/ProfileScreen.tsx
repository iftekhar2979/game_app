import React, { useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, ImageBackground, StyleSheet, Dimensions, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, ChevronLeft, Settings, Edit2, ArrowRight, Dumbbell, Trophy, Medal, BarChart3, Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { useGetMeQuery } from '../../store/api/usersApi';
import { baseApi } from '../../store/api/baseApi';
import { ReactionType, useGetFeedQuery, useReactMutation, useDeletePostMutation } from '../../store/api/socialApi';
import { PostCard } from '../../components/Community/PostCard';
import Avatar from '../../components/common/Avatar';
import { showToast } from '../../utils/toast';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user as any);
  // The server is the source of truth for your own avatar and profile data.
  const { data: me, refetch: refetchMe } = useGetMeQuery();
  const { data: feedData, isLoading: isLoadingPosts, refetch: refetchPosts } = useGetFeedQuery({ mine: true, page: 1, limit: 3 });
  const [react] = useReactMutation();
  const [deletePost] = useDeletePostMutation();

  const [refreshing, setRefreshing] = useState(false);

  const myPosts = feedData?.posts ?? [];
  const userAvatarUri = me?.avatarUrl || user?.avatarUrl || null;
  const displayName = me?.fullName || user?.fullName || me?.name || user?.name || me?.username || user?.username || 'Member';
  const username = me?.username || user?.username || '';
  const userEmail = me?.email || user?.email || '';
  const memberSince = me?.createdAt
    ? `Member since ${new Date(me.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    : userEmail || 'CheerBattle Member';
  const coins = me?.coins ?? me?.coinBalance ?? user?.coins ?? 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      dispatch(baseApi.util.invalidateTags(['User', 'Avatar', 'Social']));
      await Promise.all([
        refetchMe(),
        refetchPosts(),
      ]);
    } catch (e) {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, refetchMe, refetchPosts]);

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
    <View className="flex-1 bg-black">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B3DFF"
            colors={['#8B3DFF', '#E0B566']}
            progressBackgroundColor="#121212"
          />
        }
      >

        {/* Banner Section */}
        <View className="relative w-full h-[200px]">
          <ImageBackground
            source={require('../../assets/images/utils/image 75.png')}
            className="w-full h-full rounded-b-[40px] overflow-hidden opacity-90"
          >
            <View className="absolute inset-0 bg-black/20" />
          </ImageBackground>

          {/* Header Buttons over Banner */}
          <SafeAreaView edges={['top']} className="absolute top-0 w-full flex-row justify-between px-5 pt-2">
            <TouchableOpacity
              className="w-10 h-10 rounded-[12px] border border-white/30 justify-center items-center bg-black/40"
              onPress={() => navigation.goBack()}
            >
              <ChevronLeft color="#fff" size={24} />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-10 h-10 rounded-[12px] border border-white/30 justify-center items-center bg-black/40"
              onPress={() => navigation.navigate('Settings' as never)}
            >
              <Settings color="#fff" size={20} />

            </TouchableOpacity>
          </SafeAreaView>

          {/* Avatar over the Banner edge */}
          <View className="absolute -bottom-12 left-1/2 -ml-[50px] items-center justify-center z-10">
            <View className="w-[100px] h-[100px] rounded-full border-[4px] border-black overflow-hidden relative">
              <Avatar uri={userAvatarUri} name={displayName} size={96} />
            </View>
            <TouchableOpacity
              className="absolute bottom-1 right-1 w-7 h-7 bg-[#FFB84D] rounded-full justify-center items-center border-[2px] border-black"
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Edit2 color="#000" size={12} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Info */}
        <View className="mt-16 items-center px-5">
          <Text className="text-white text-[20px] font-bold mb-0.5 text-center">
            {displayName}
          </Text>
          {username ? (
            <Text className="text-[#FFB84D] text-[13px] font-medium mb-1">
              @{username}
            </Text>
          ) : null}
          <Text className="text-gray-400 text-[13px] mb-4 text-center">
            {memberSince}
          </Text>

          <TouchableOpacity
            className="flex-row items-center border border-[#8B3DFF] rounded-full px-4 py-1.5 mb-3"
            onPress={() => navigation.navigate('AvatarHistory')}
            accessibilityLabel="View my saved avatars"
            accessibilityRole="button"
          >
            <Sparkles color="#8B3DFF" size={14} />
            <Text className="text-gray-300 text-[14px] font-medium mx-2">My avatars</Text>
            <ArrowRight color="#999" size={14} />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center border border-[#FFB84D] rounded-full px-4 py-1.5 mb-8"
            onPress={() => navigation.navigate('CoinStore')}
          >
            <Text className="text-[14px] mr-1">🪙</Text>
            <Text className="text-gray-300 text-[14px] font-medium mr-2">Coin: {coins}</Text>
            <ArrowRight color="#999" size={14} />
          </TouchableOpacity>
        </View>

        {/* XP Progress Section */}
        <View className="flex-row items-center px-5 mb-8">
          <View className="w-[60px] h-[70px] border border-[#00FFFF] rounded-[16px] justify-center items-center mr-4 bg-[#00FFFF]/10" style={{ transform: [{ rotate: '45deg' }] }}>
            <View style={{ transform: [{ rotate: '-45deg' }], alignItems: 'center' }}>
              <Text className="text-[#00FFFF] text-[12px] font-medium">Level</Text>
              <Text className="text-[#00FFFF] text-[18px] font-bold">28</Text>
            </View>
          </View>
          <View className="flex-1 justify-center ml-2">
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-300 text-[12px]">XP progress</Text>
              <Text className="text-gray-300 text-[12px]">6250 / 10,000 XP</Text>
            </View>
            <View className="w-full h-[6px] bg-[#333] rounded-full overflow-hidden mb-2">
              <View className="h-full bg-[#00FFFF]" style={{ width: '63%' }} />
            </View>
            <Text className="text-gray-400 text-[11px]">63 % of level 28</Text>
          </View>
        </View>

        {/* Favorites 2-Column Row */}
        <View className="flex-row justify-between px-5 mb-4">
          <View className="flex-1 border border-[#331166] rounded-[24px] p-4 mr-2 flex-row items-center bg-[#1a0533]">
            <Dumbbell color="#00FFFF" size={28} className="mr-3" />
            <View>
              <Text className="text-gray-400 text-[10px] mb-1">Favorite GYM</Text>
              <Text className="text-[#FFB84D] text-[12px] font-semibold mb-0.5">Iron Paradise</Text>
              <Text className="text-gray-400 text-[11px]">Texas</Text>
            </View>
          </View>

          <View className="flex-1 border border-[#331166] rounded-[24px] p-4 ml-2 flex-row items-center bg-[#1a0533]">
            <Trophy color="#00FFFF" size={28} className="mr-3" />
            <View>
              <Text className="text-gray-400 text-[10px] mb-1">Favorite team</Text>
              <Text className="text-[#FFB84D] text-[12px] font-semibold mb-0.5">Kansas City</Text>
              <Text className="text-gray-400 text-[11px]">Texas</Text>
            </View>
          </View>
        </View>

        {/* Stats 3-Column Row */}
        <View className="flex-row justify-between px-5 mb-8">
          <View className="flex-1 border border-[#331166] rounded-[24px] p-4 mr-1.5 items-center bg-[#1a0533]">
            <Trophy color="#00FFFF" size={24} className="mb-2" />
            <Text className="text-[#FFB84D] text-[11px] mb-1">Wins</Text>
            <Text className="text-white text-[14px] font-semibold">142</Text>
          </View>

          <View className="flex-1 border border-[#331166] rounded-[24px] p-4 mx-1.5 items-center bg-[#1a0533]">
            <Medal color="#00FFFF" size={24} className="mb-2" />
            <Text className="text-[#FFB84D] text-[11px] text-center leading-[12px] mb-1">League{'\n'}champions</Text>
            <Text className="text-white text-[14px] font-semibold">142</Text>
          </View>

          <View className="flex-1 border border-[#331166] rounded-[24px] p-4 ml-1.5 items-center bg-[#1a0533]">
            <BarChart3 color="#00FFFF" size={24} className="mb-2" />
            <Text className="text-[#FFB84D] text-[11px] mb-1">DFS record</Text>
            <Text className="text-white text-[14px] font-semibold">142</Text>
          </View>
        </View>

        {/* Posts Section */}
        <View className="px-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-[18px] font-semibold">My Posts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AllPosts')}>
              <Text className="text-[#E0B566] text-[13px] font-medium">See all</Text>
            </TouchableOpacity>
          </View>

          {isLoadingPosts ? (
            <View className="py-8 items-center justify-center">
              <ActivityIndicator size="small" color="#E0B566" />
            </View>
          ) : myPosts.length === 0 ? (
            <View className="bg-[#121212] border border-[#222] rounded-2xl p-6 items-center justify-center mb-6">
              <Text className="text-gray-400 text-sm text-center mb-4">
                You haven't shared any community posts yet.
              </Text>
              <TouchableOpacity
                className="bg-[#8B3DFF] px-4 py-2.5 rounded-xl flex-row items-center"
                onPress={() => navigation.navigate('CreatePost')}
                activeOpacity={0.85}
              >
                <Plus color="#fff" size={16} />
                <Text className="text-white text-xs font-bold ml-1.5">Create First Post</Text>
              </TouchableOpacity>
            </View>
          ) : (
            myPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onReact={(type) => handleReact(post.id, type)}
                onOpenComments={() => navigation.navigate('PostDetails', { postId: post.id })}
                onPressImage={() => navigation.navigate('PostDetails', { postId: post.id })}
                onDelete={() => handleDeletePost(post.id)}
              />
            ))
          )}

        </View>
      </ScrollView>
    </View>
  );
}
