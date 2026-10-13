import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Bell, PlusSquare, Settings, Zap } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { RootStackParamList } from '../../../App';
import { RootState } from '../../store';
import { baseApi } from '../../store/api/baseApi';
import { useGetLeaguesQuery } from '../../store/api/leagueApi';
import { useGetNotificationBadgeQuery } from '../../store/api/notificationApi';
import { useGetMeQuery } from '../../store/api/usersApi';
import { useGetMyAvatarsQuery } from '../../store/api/avatarApi';
import CharacterCard from '../../components/Home/CharacterCard';
import { getBaseById } from '../../avatar/registry';
import { normaliseConfig } from '../../avatar/resolveConfig';
import { defaultAvatarConfigFor } from '../../avatar/defaultAvatar';

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
  // Same args as the wardrobe screen, so both share one cache entry.
  const { data: avatarData, refetch: refetchAvatars } = useGetMyAvatarsQuery({ page: 1, limit: 30 });

  const userDisplayName = me?.fullName || currentUser?.fullName || 'Player';
  const userAvatarUri = me?.avatarUrl || currentUser?.avatarUrl || null;

  // Level and XP use the same formula as the profile screen.
  const totalScore = Number(me?.totalScore ?? currentUser?.totalScore ?? 0);
  const currentLevel = Math.max(1, Math.floor(totalScore / 100) + 1);
  const xpPercent = Math.min(100, totalScore % 100);

  /** The applied look, rendered live from its config like the wardrobe does. */
  const currentAvatar = useMemo(() => {
    const avatars = avatarData?.avatars ?? [];
    const entry = avatars.find((a) => a.isCurrent);
    // Every row's artwork, so a config from the profile can still find
    // dashboard-uploaded parts; see AvatarHistoryScreen.
    const artwork = avatars.reduce<Record<string, any>>(
      (byKey, row) => Object.assign(byKey, row.artwork),
      {},
    );
    // The profile's own config when the wardrobe has no applied row, so the
    // live avatar draws instead of the flat snapshot.
    const saved = normaliseConfig(entry?.avatarConfig ?? me?.avatarConfig);
    const snapshotUri = entry?.avatarUrl ?? null;
    // Someone who has never built an avatar still gets a character, never
    // their initials. An old snapshot-only avatar is theirs, so it wins.
    const hasSnapshot = Boolean(snapshotUri || me?.avatarUrl || currentUser?.avatarUrl);
    const config =
      saved ?? (hasSnapshot ? null : defaultAvatarConfigFor(me?.gender ?? currentUser?.gender));
    return { config, artwork, snapshotUri };
  }, [avatarData, me?.avatarConfig, me?.avatarUrl, me?.gender, currentUser?.avatarUrl, currentUser?.gender]);
  const unreadBadgeCount = badgeData?.data?.unreadCount ?? 0;
  const leagueList = (Array.isArray(apiLeagues) ? apiLeagues : apiLeagues?.data) || [];
  const leagues = leagueList.length > 0 ? leagueList : createdLeagues;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      dispatch(baseApi.util.invalidateTags(['League', 'User']));
      await Promise.all([refetchMe(), refetchLeagues(), refetchAvatars()]);
    } catch {
      // The current cards remain visible if a refresh fails.
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, refetchMe, refetchLeagues, refetchAvatars]);

  /** Opens the editor on the applied look, or the character picker if it cannot be reopened. */
  const handleCustomize = () => {
    const base = getBaseById(currentAvatar.config?.base);
    if (!base) {
      navigation.navigate('ExploreAvatar', { returnTo: 'Home' });
      return;
    }
    navigation.navigate('GenerateAvatar', {
      isFullbody: base.isFullbody,
      target: base.target,
      baseId: base.id,
      returnTo: 'Home',
      config: currentAvatar.config,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#0a0a0a]" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-end px-5 pt-2 pb-3">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          className="p-2"
          onPress={() => navigation.navigate('Notification')}
        >
          <Bell color="#d1d5db" size={22} />
          {unreadBadgeCount > 0 && (
            <View className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-[#0a0a0a]" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Settings"
          className="p-2 ml-1"
          onPress={() => navigation.navigate('Settings')}
        >
          <Settings color="#d1d5db" size={22} />
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
        <CharacterCard
          name={userDisplayName}
          level={currentLevel}
          totalXp={totalScore}
          xpPercent={xpPercent}
          config={currentAvatar.config}
          catalogue={currentAvatar.artwork}
          fallbackUri={currentAvatar.snapshotUri || userAvatarUri}
          onPressAvatar={() => navigation.navigate('Profile')}
          onCustomize={handleCustomize}
        />

        <View className="mb-5">
          <View className="flex-row items-center justify-between px-5 mb-3">
            <Text className="text-white text-[18px] font-bold">Fantasy Leagues</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FantasyLeague')}>
              <Text className="text-gray-400 text-sm font-semibold">See all</Text>
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
            <View className="px-5">
              {leagues.slice(0, 3).map((league: any) => {
                const leagueId = league._id || league.id;
                const logoUri = league.logoUri || league.logoUrl;
                return (
                  <TouchableOpacity
                    key={leagueId}
                    accessibilityRole="button"
                    className="mb-3 bg-[#18161b] border border-[#2c2930] rounded-[14px] px-3 py-3 flex-row items-center"
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('LeagueDetail', { leagueId })}
                  >
                    {logoUri ? (
                      <Image source={{ uri: logoUri }} className="w-10 h-10 rounded-xl mr-3" />
                    ) : (
                      <View className="w-10 h-10 rounded-xl bg-[#2a2038] mr-3" />
                    )}
                    <View className="flex-1">
                      <Text className="text-white text-[15px] font-semibold" numberOfLines={1}>
                        {league.name || 'Fantasy League'}
                      </Text>
                      <Text className="text-gray-500 text-[11px] mt-0.5" numberOfLines={1}>
                        Season Long Fantasy
                      </Text>
                    </View>
                    <Text className="text-[#F5A04A] text-[13px] font-semibold ml-2">Open</Text>
                    <ArrowRight color="#F5A04A" size={14} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View className="px-5">
          <Text className="text-white text-[18px] font-bold mb-3">Daily Contests</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Play daily contest"
            className="bg-[#18161b] border border-[#2c2930] rounded-[14px] px-4 py-4 flex-row items-center"
            activeOpacity={0.85}
            onPress={() => navigation.navigate('DfsContests')}
          >
            <Zap color="#F5A04A" fill="#F5A04A" size={20} />
            <Text className="flex-1 text-white text-[15px] font-semibold ml-3">Play Daily Contest</Text>
            <ArrowRight color="#d1d5db" size={18} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

