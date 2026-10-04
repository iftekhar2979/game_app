import React, { useCallback, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, PlusSquare, Zap } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../App';
import { RootState } from '../../store';
import { baseApi } from '../../store/api/baseApi';
import { useGetLeaguesQuery } from '../../store/api/leagueApi';
import { useGetNotificationBadgeQuery } from '../../store/api/notificationApi';
import { useGetMeQuery } from '../../store/api/usersApi';
import Avatar from '../../components/common/Avatar';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = useSelector((state: RootState) => state.auth.user as any);
  const createdLeagues = useSelector((state: RootState) => state.league.leagues);
  const { data: me, refetch: refetchMe } = useGetMeQuery();
  const { data: apiLeagues, refetch: refetchLeagues } = useGetLeaguesQuery();
  const { data: badgeData } = useGetNotificationBadgeQuery();

  const userDisplayName = me?.fullName || currentUser?.fullName || 'Player';
  const userAvatarUri = me?.avatarUrl || currentUser?.avatarUrl || null;
  const unreadBadgeCount = badgeData?.data?.unreadCount ?? 0;
  const leagueList = (Array.isArray(apiLeagues) ? apiLeagues : apiLeagues?.data) || [];
  const leagues = leagueList.length > 0 ? leagueList : createdLeagues;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      dispatch(baseApi.util.invalidateTags(['League', 'User']));
      await Promise.all([refetchMe(), refetchLeagues()]);
    } catch {
      // The current cards remain visible if a refresh fails.
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, refetchMe, refetchLeagues]);

  return (
    <SafeAreaView className="flex-1 bg-[#0a0a0a]" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-5 pt-3 pb-6">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          className="flex-row items-center flex-1 mr-4"
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Profile')}
        >
          <Avatar uri={userAvatarUri} name={userDisplayName} size={64} />
          <View className="ml-3 flex-1">
            <Text className="text-white text-[20px] font-bold" numberOfLines={1}>
              {userDisplayName}
            </Text>
            <Text className="text-gray-400 text-[13px] mt-1">Ready to play?</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          className="p-2"
          onPress={() => navigation.navigate('Notification')}
        >
          <Bell color={unreadBadgeCount > 0 ? '#8B3DFF' : '#999'} size={24} />
          {unreadBadgeCount > 0 && (
            <View className="absolute top-0 right-0 bg-red-500 min-w-4 h-4 rounded-full items-center justify-center">
              <Text className="text-white text-[9px] font-bold">
                {unreadBadgeCount > 99 ? '99+' : unreadBadgeCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B3DFF"
            colors={['#8B3DFF', '#E0B566']}
          />
        }
      >
        <View className="mb-8">
          <View className="flex-row items-center justify-between px-5 mb-4">
            <Text className="text-white text-[22px] font-bold">Fantasy Leagues</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FantasyLeague')}>
              <Text className="text-[#E0B566] text-sm font-semibold">See all</Text>
            </TouchableOpacity>
          </View>

          {leagues.length === 0 ? (
            <View className="mx-5 bg-[#121212] border border-[#333] rounded-[20px] p-6 items-center">
              <Text className="text-gray-400 text-sm text-center mb-4">
                No fantasy leagues yet. Create one to begin.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                className="bg-[#8B3DFF] px-4 py-3 rounded-xl flex-row items-center"
                onPress={() => navigation.navigate('CreateLeague')}
              >
                <PlusSquare color="#fff" size={18} />
                <Text className="text-white text-sm font-bold ml-2">Create League</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {leagues.slice(0, 3).map((league: any) => {
                const leagueId = league._id || league.id;
                const logoUri = league.logoUri || league.logoUrl;
                return (
                  <TouchableOpacity
                    key={leagueId}
                    accessibilityRole="button"
                    className="w-[260px] mr-3 bg-[#121212] border border-[#333] rounded-[20px] p-4 flex-row items-center"
                    onPress={() => navigation.navigate('LeagueDetail', { leagueId })}
                  >
                    {logoUri ? (
                      <Image source={{ uri: logoUri }} className="w-11 h-11 rounded-full mr-3" />
                    ) : (
                      <View className="w-11 h-11 rounded-full bg-[#2a2038] mr-3" />
                    )}
                    <View className="flex-1">
                      <Text className="text-white text-base font-semibold" numberOfLines={1}>
                        {league.name || 'Fantasy League'}
                      </Text>
                      <Text className="text-[#E0B566] text-xs mt-1" numberOfLines={1}>
                        Head-to-head team rosters
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View className="px-5">
          <Text className="text-white text-[22px] font-bold mb-4">Daily Contests</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open Daily Contests"
            className="bg-[#17121f] border border-[#5b387e] rounded-[20px] p-5 flex-row items-center"
            activeOpacity={0.85}
            onPress={() => navigation.navigate('DfsContests')}
          >
            <View className="w-12 h-12 rounded-2xl bg-[#2a2038] items-center justify-center mr-4">
              <Zap color="#B98AFF" size={24} />
            </View>
            <View className="flex-1">
              <Text className="text-white text-[17px] font-bold">Play a daily contest</Text>
              <Text className="text-gray-400 text-xs mt-1">
                Build a lineup for one competition
              </Text>
            </View>
            <Text className="text-[#E0B566] text-sm font-bold ml-2">Play →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
