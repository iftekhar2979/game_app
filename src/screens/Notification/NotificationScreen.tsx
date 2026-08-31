import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Bell,
  CheckCheck,
  MessageSquare,
  Sparkles,
  Shield,
  Trophy,
  Megaphone,
  Heart,
  ChevronRight,
  Info,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  NotificationItem,
} from '../../store/api/notificationApi';
import { showToast } from '../../utils/toast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type FilterTab = 'all' | 'unread' | 'social' | 'system';

export default function NotificationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [page, setPage] = useState(1);
  const [accumulatedItems, setAccumulatedItems] = useState<NotificationItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Build query params based on selected filter
  const queryParams = useMemo(() => {
    const params: { page: number; limit: number; isRead?: boolean; category?: string } = {
      page,
      limit: 15,
    };
    if (activeFilter === 'unread') {
      params.isRead = false;
    } else if (activeFilter === 'social') {
      params.category = 'social';
    } else if (activeFilter === 'system') {
      params.category = 'system';
    }
    return params;
  }, [page, activeFilter]);

  const { data, isLoading, isFetching, refetch } = useGetNotificationsQuery(queryParams);

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead, { isLoading: isMarkingAll }] = useMarkAllNotificationsAsReadMutation();

  // Accumulate list for pagination and reset on filter or refresh
  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAccumulatedItems(data.data);
      } else {
        setAccumulatedItems((prev) => {
          const existingIds = new Set(prev.map((item) => item._id));
          const newItems = data.data.filter((item) => !existingIds.has(item._id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [data, page]);

  const handleFilterChange = (filter: FilterTab) => {
    if (activeFilter !== filter) {
      setActiveFilter(filter);
      setPage(1);
      setAccumulatedItems([]);
    }
  };

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
    const hasMore = data?.pagination?.hasMore ?? false;
    if (!isFetching && hasMore) {
      setPage((prev) => prev + 1);
    }
  };

  const handleNotificationPress = async (item: NotificationItem) => {
    // 1. Mark as read optimistically if unread
    if (!item.isRead) {
      try {
        await markAsRead(item._id).unwrap();
        setAccumulatedItems((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
        );
      } catch (e) {
        // Continue navigation even if marking fails
      }
    }

    // 2. Intelligent deep-link / screen routing
    const metadata = item.metadata;
    if (metadata) {
      const screen = metadata.screen;
      const relatedType = metadata.relatedType;
      const relatedId = metadata.relatedId;

      if (screen === 'PostDetails' && relatedId) {
        navigation.navigate('PostDetails', { postId: relatedId });
        return;
      }
      if (screen === 'LeagueDetail' && relatedId) {
        navigation.navigate('LeagueDetail', { leagueId: relatedId });
        return;
      }
      if (screen === 'DfsContestDetail' && relatedId) {
        navigation.navigate('DfsContestDetail', { contestId: relatedId });
        return;
      }
      if (relatedType === 'post' && relatedId) {
        navigation.navigate('PostDetails', { postId: relatedId });
        return;
      }
      if (relatedType === 'comment' && relatedId) {
        navigation.navigate('PostDetails', { postId: relatedId });
        return;
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead().unwrap();
      setAccumulatedItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
      showToast.success('Updated', 'All notifications marked as read');
    } catch (e) {
      showToast.error('Error', 'Failed to mark notifications as read');
    }
  };

  const formatNotificationTime = (dateStr: string) => {
    try {
      const now = new Date();
      const date = new Date(dateStr);
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  const getCategoryIcon = (category: string, reason?: string) => {
    switch (category?.toLowerCase()) {
      case 'social':
        if (reason?.includes('reaction') || reason?.includes('like')) {
          return <Heart color="#EC4899" size={18} />;
        }
        return <MessageSquare color="#8B3DFF" size={18} />;
      case 'billing':
        return <Sparkles color="#E0B566" size={18} />;
      case 'admin':
        return <Megaphone color="#F59E0B" size={18} />;
      case 'quiz':
      case 'fantasy':
        return <Trophy color="#06B6D4" size={18} />;
      case 'system':
      default:
        return <Bell color="#8B3DFF" size={18} />;
    }
  };

  const unreadCount = data?.unreadCount ?? 0;

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isUnread = !item.isRead;
    return (
      <TouchableOpacity
        className={`p-4 mb-2.5 rounded-2xl border transition-all ${
          isUnread
            ? 'bg-[#18122B]/90 border-[#8B3DFF]/50 shadow-md shadow-[#8B3DFF]/10'
            : 'bg-[#121215] border-[#222]'
        }`}
        activeOpacity={0.75}
        onPress={() => handleNotificationPress(item)}
      >
        <View className="flex-row items-start">
          {/* Icon Badge */}
          <View
            className={`w-10 h-10 rounded-full items-center justify-center mr-3.5 ${
              isUnread ? 'bg-[#8B3DFF]/20' : 'bg-[#1E1E24]'
            }`}
          >
            {getCategoryIcon(item.category, item.metadata?.reason)}
          </View>

          {/* Notification Content */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center flex-1 mr-2">
                <Text
                  className={`text-[15px] font-semibold ${
                    isUnread ? 'text-white' : 'text-gray-200'
                  }`}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                {isUnread && (
                  <View className="w-2 h-2 rounded-full bg-[#8B3DFF] ml-2" />
                )}
              </View>
              <Text className="text-gray-500 text-[11px]">
                {formatNotificationTime(item.createdAt)}
              </Text>
            </View>

            <Text
              className="text-gray-400 text-[13px] leading-5"
              numberOfLines={3}
            >
              {item.body}
            </Text>

            {item.metadata?.screen && (
              <View className="flex-row items-center mt-2.5">
                <Text className="text-[#8B3DFF] text-[11px] font-semibold mr-1">
                  View details
                </Text>
                <ChevronRight color="#8B3DFF" size={12} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0A0A0E]">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-[#1E1E24]">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-[#18181D] items-center justify-center mr-3 border border-[#2A2A32]"
            hitSlop={8}
          >
            <ChevronLeft color="#fff" size={22} />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-[20px] font-bold">Notifications</Text>
            {unreadCount > 0 && (
              <Text className="text-[#8B3DFF] text-[11px] font-semibold">
                {unreadCount} unread
              </Text>
            )}
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            disabled={isMarkingAll}
            className="flex-row items-center bg-[#8B3DFF]/15 px-3 py-1.5 rounded-full border border-[#8B3DFF]/30"
          >
            {isMarkingAll ? (
              <ActivityIndicator size="small" color="#8B3DFF" />
            ) : (
              <>
                <CheckCheck color="#8B3DFF" size={14} className="mr-1.5" />
                <Text className="text-[#8B3DFF] text-[12px] font-bold">
                  Mark all read
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View className="flex-row px-5 py-3 border-b border-[#1A1A20] gap-2">
        <TouchableOpacity
          onPress={() => handleFilterChange('all')}
          className={`px-4 py-1.5 rounded-full border ${
            activeFilter === 'all'
              ? 'bg-[#8B3DFF] border-[#8B3DFF]'
              : 'bg-[#141418] border-[#26262E]'
          }`}
        >
          <Text
            className={`text-[12px] font-semibold ${
              activeFilter === 'all' ? 'text-white font-bold' : 'text-gray-400'
            }`}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleFilterChange('unread')}
          className={`px-4 py-1.5 rounded-full border ${
            activeFilter === 'unread'
              ? 'bg-[#8B3DFF] border-[#8B3DFF]'
              : 'bg-[#141418] border-[#26262E]'
          }`}
        >
          <Text
            className={`text-[12px] font-semibold ${
              activeFilter === 'unread' ? 'text-white font-bold' : 'text-gray-400'
            }`}
          >
            Unread
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleFilterChange('social')}
          className={`px-4 py-1.5 rounded-full border ${
            activeFilter === 'social'
              ? 'bg-[#8B3DFF] border-[#8B3DFF]'
              : 'bg-[#141418] border-[#26262E]'
          }`}
        >
          <Text
            className={`text-[12px] font-semibold ${
              activeFilter === 'social' ? 'text-white font-bold' : 'text-gray-400'
            }`}
          >
            Social
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleFilterChange('system')}
          className={`px-4 py-1.5 rounded-full border ${
            activeFilter === 'system'
              ? 'bg-[#8B3DFF] border-[#8B3DFF]'
              : 'bg-[#141418] border-[#26262E]'
          }`}
        >
          <Text
            className={`text-[12px] font-semibold ${
              activeFilter === 'system' ? 'text-white font-bold' : 'text-gray-400'
            }`}
          >
            System
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      {isLoading && page === 1 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8B3DFF" />
          <Text className="text-gray-400 text-[13px] mt-3">
            Loading notifications...
          </Text>
        </View>
      ) : accumulatedItems.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-16 h-16 rounded-full bg-[#18181F] items-center justify-center mb-4 border border-[#282832]">
            <Bell color="#666" size={28} />
          </View>
          <Text className="text-white text-[17px] font-bold text-center mb-1">
            {activeFilter === 'unread'
              ? 'No Unread Notifications'
              : 'No Notifications Yet'}
          </Text>
          <Text className="text-gray-500 text-[13px] text-center leading-5">
            {activeFilter === 'unread'
              ? 'You have caught up on all your latest updates and alerts.'
              : 'When you receive comments, fantasy results, or announcements, they will show up here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={accumulatedItems}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8B3DFF"
              colors={['#8B3DFF', '#E0B566']}
              progressBackgroundColor="#121215"
            />
          }
          ListFooterComponent={
            isFetching && page > 1 ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#8B3DFF" />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
