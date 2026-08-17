import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Users } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setActiveTeam } from '../../store/slices/leagueSlice';
import {
  useGetLeagueDetailsQuery,
  useGetLeagueMembersQuery,
  useGetAvailableAthletesQuery,
  useGetLeagueRostersQuery,
  useJoinLeagueMutation,
  useDraftPickMutation,
} from '../../store/api/leagueApi';
import { getSocket, joinLeagueRoom, leaveLeagueRoom } from '../../services/socketService';
import { showToast } from '../../utils/toast';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DraftRoom'>;
type RouteProps = RouteProp<RootStackParamList, 'DraftRoom'>;

const MOCK_USERS = [
  { id: '1', name: 'Okafor', avatarUri: 'https://i.pravatar.cc/150?img=1' },
  { id: '2', name: 'Walter', avatarUri: 'https://i.pravatar.cc/150?img=2' },
  { id: '3', name: 'Noah', avatarUri: 'https://i.pravatar.cc/150?img=3' },
  { id: '4', name: 'Leonardo', avatarUri: 'https://i.pravatar.cc/150?img=4' },
];

const MOCK_PLAYERS = [
  { id: 'p1', name: 'Noah Okafor', rostered: '17%', points: '+10', avatarUri: 'https://i.pravatar.cc/150?img=12' },
  { id: 'p2', name: 'Leonardo Trossard', rostered: '32%', points: '+9', avatarUri: 'https://i.pravatar.cc/150?img=13' },
  { id: 'p3', name: 'Walter bentiez', rostered: '4%', points: '+5', avatarUri: 'https://i.pravatar.cc/150?img=14' },
  { id: 'p4', name: '2026 Final cheer', rostered: '1%', points: '+3', avatarUri: 'https://i.pravatar.cc/150?img=15' },
];

export default function DraftRoomScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const leagueId = route.params?.leagueId;
  const isMockId = !leagueId || leagueId.startsWith('mock-');

  const league = useSelector((state: RootState) => state.league.leagues.find(l => l.id === leagueId));
  const reduxActiveTeamId = useSelector((state: RootState) => state.league.activeTeams?.[leagueId]?.teamId);

  const currentUserId = useSelector(
    (state: RootState) =>
      (state.auth?.user as any)?._id ||
      (state.auth?.user as any)?.id ||
      (state.auth?.user as any)?.sub ||
      (state.auth?.user as any)?.userId
  );
  const [draftPick, { isLoading: isDrafting }] = useDraftPickMutation();
  const [joinLeagueMutation, { isLoading: isJoining }] = useJoinLeagueMutation();

  const { data: apiLeagueData } = useGetLeagueDetailsQuery(leagueId, {
    skip: isMockId,
  });

  const { data: apiMembersData, isLoading: isLoadingMembers } = useGetLeagueMembersQuery(leagueId, {
    skip: isMockId,
  });
  const { data: apiRostersData } = useGetLeagueRostersQuery(leagueId, {
    skip: isMockId,
  });
  const { data: apiAthletesData, isLoading: isLoadingAthletes, refetch: refetchAvailableAthletes } = useGetAvailableAthletesQuery(leagueId, {
    skip: isMockId,
  });

  const callerInfo = (apiLeagueData as any)?.caller;

  const rosterTeam = useMemo(() => {
    const rawRosters = Array.isArray(apiRostersData)
      ? apiRostersData
      : Array.isArray((apiRostersData as any)?.data)
      ? (apiRostersData as any).data
      : [];
    if (rawRosters.length === 0) return null;
    if (currentUserId) {
      const match = rawRosters.find((r: any) => {
        const ownerId = r.ownerId || r.ownerUserId || r.userId?._id || r.userId?.id || r.userId;
        return String(ownerId) === String(currentUserId);
      });
      if (match) return match;
    }
    return null;
  }, [apiRostersData, currentUserId]);

  const userTeamObj = useMemo(() => {
    const memberList = Array.isArray(apiMembersData)
      ? apiMembersData
      : Array.isArray(apiMembersData?.data)
      ? apiMembersData.data
      : [];
    return memberList.find((m: any) => {
      const uId =
        m.userId?._id ||
        m.userId?.id ||
        (typeof m.userId === 'string' ? m.userId : null) ||
        m.user?._id ||
        m.user?.id ||
        m.team?.ownerId ||
        m.team?.ownerUserId;
      return String(uId) === String(currentUserId);
    });
  }, [apiMembersData, currentUserId]);

  const userTeamId =
    reduxActiveTeamId ||
    callerInfo?.team?._id ||
    callerInfo?.team?.id ||
    rosterTeam?._id ||
    rosterTeam?.id ||
    userTeamObj?.team?._id ||
    userTeamObj?.team?.id ||
    userTeamObj?._id;

  // Persist user team ID to Redux global state
  useEffect(() => {
    if (leagueId && userTeamId && userTeamId !== reduxActiveTeamId) {
      dispatch(setActiveTeam({ leagueId, teamId: String(userTeamId) }));
    }
  }, [leagueId, userTeamId, reduxActiveTeamId, dispatch]);

  // Real-time playerAcquired socket listener
  useEffect(() => {
    if (!leagueId || isMockId) return;
    try {
      const socket = getSocket();
      joinLeagueRoom(leagueId);

      const handlePlayerAcquired = (data: any) => {
        if (data && String(data.leagueId) === String(leagueId)) {
          if (refetchAvailableAthletes) refetchAvailableAthletes();
        }
      };

      socket.on('playerAcquired', handlePlayerAcquired);
      return () => {
        socket.off('playerAcquired', handlePlayerAcquired);
        leaveLeagueRoom(leagueId);
      };
    } catch (e) {
      console.warn('DraftRoom socket error:', e);
    }
  }, [leagueId, isMockId, refetchAvailableAthletes]);

  const teamsList = useMemo(() => {
    const memberList = Array.isArray(apiMembersData)
      ? apiMembersData
      : Array.isArray(apiMembersData?.data)
      ? apiMembersData.data
      : [];

    if (memberList.length > 0) {
      return memberList.map((m: any, idx: number) => {
        const teamObj = m.team || {};
        const userObj = m.user || (typeof m.userId === 'object' ? m.userId : {});
        const teamName = teamObj.name || m.fantasyTeamName || userObj.fullName || userObj.username || m.name || `Team ${idx + 1}`;
        const avatarUri =
          teamObj.avatarUri ||
          teamObj.logoUrl ||
          userObj.avatarUrl ||
          m.avatarUri ||
          `https://i.pravatar.cc/150?img=${(idx % 12) + 1}`;

        return {
          id: m._id || m.id || `member-${idx}`,
          name: teamName,
          avatarUri,
        };
      });
    }

    return MOCK_USERS;
  }, [apiMembersData]);

  const playersList = useMemo(() => {
    const rawList = Array.isArray(apiAthletesData)
      ? apiAthletesData
      : Array.isArray(apiAthletesData?.data)
      ? apiAthletesData.data
      : [];

    if (rawList.length > 0) {
      return rawList.map((item: any, idx: number) => {
        const athlete = item.athlete || item;
        const name = athlete.name || athlete.fullName || `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim() || `Athlete ${idx + 1}`;
        const rosteredPercent = item.rosteredPercentage ?? (15 + (idx * 3) % 40);
        const points = item.projectedPoints ? `+${item.projectedPoints}` : `+${(idx % 12) + 3}`;
        const avatarUri = athlete.photoUrl || athlete.avatarUri || athlete.avatarUrl || `https://i.pravatar.cc/150?img=${(idx % 20) + 1}`;

        return {
          id: item._id || item.id || `p-${idx}`,
          name,
          rostered: `${rosteredPercent}%`,
          points,
          avatarUri,
        };
      });
    }

    return MOCK_PLAYERS;
  }, [apiAthletesData]);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'empty' | 'filled'>('filled');
  const [setPlayerModalVisible, setSetPlayerModalVisible] = useState(false);
  const [draftedPlayers, setDraftedPlayers] = useState<Record<string, any>>({});
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [isDraftStarted, setIsDraftStarted] = useState(false);

  useEffect(() => {
    if (!league?.draftDate || !league?.draftTime) return;

    const dDate = new Date(league.draftDate);
    const tTime = new Date(league.draftTime);
    dDate.setHours(tTime.getHours(), tTime.getMinutes(), 0, 0);
    const targetTime = dDate.getTime();

    const checkTime = () => {
      if (Date.now() >= targetTime) {
        setIsDraftStarted(true);
      } else {
        setIsDraftStarted(false);
      }
    };

    checkTime();
    const intervalId = setInterval(checkTime, 1000);

    return () => clearInterval(intervalId);
  }, [league?.draftDate, league?.draftTime]);


  // Generate 6x4 grid (6 rows, 4 columns)
  const gridRows = [1, 2, 3, 4, 5, 6];
  const gridCols = [1, 2, 3, 4];

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2.5 pb-4 border-b border-[#222]">
        <TouchableOpacity
          className="w-11 h-11 rounded-xl border border-[#333] justify-center items-center mr-4"
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-[20px] font-bold">Draft Room</Text>
          <Text className="text-gray-400 text-[12px]">
            {league?.name ? `${league.name} • ` : ''}
            {isDraftStarted
              ? 'Draft Open'
              : league?.draftDate && league?.draftTime
              ? `Scheduled: ${new Date(league.draftDate).toLocaleDateString()} ${new Date(league.draftTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Draft Room Open'}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Top Teams Header */}
        <View className="my-4">
          <Text className="text-gray-400 text-[12px] px-5 mb-2 font-medium">League Managers ({teamsList.length})</Text>
          {isLoadingMembers ? (
            <ActivityIndicator color="#8B3DFF" size="small" style={{ marginVertical: 10 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {teamsList.map((user: any) => {
                const isUserTeam = String(user.id) === String(userTeamId) || String(user.id) === String(userTeamObj?._id);
                return (
                  <View key={user.id} className="items-center mr-5 w-16">
                    <View className={`rounded-full p-0.5 ${isUserTeam ? 'border-2 border-[#8B3DFF]' : ''}`}>
                      <Image source={{ uri: user.avatarUri }} className="w-10 h-10 rounded-full bg-[#222] border border-[#333]" resizeMode="cover" />
                    </View>
                    <Text className={`text-[11px] text-center font-medium mt-1 ${isUserTeam ? 'text-[#8B3DFF] font-bold' : 'text-gray-300'}`} numberOfLines={1}>
                      {user.name}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Draft Action Banner */}
        <View className="px-5 mb-5">
          <TouchableOpacity
            className="w-full bg-[#8B3DFF] h-[52px] rounded-2xl flex-row justify-center items-center shadow-lg"
            onPress={() => setSetPlayerModalVisible(true)}
            disabled={isDrafting || isLoadingAthletes}
            activeOpacity={0.8}
          >
            {isDrafting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Users color="#fff" size={20} className="mr-2" />
                <Text className="text-white text-[15px] font-bold">Pick Draft Player</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Available Players Pool Section */}
        <View className="px-5 pb-10">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-[18px] font-bold">Available Players Pool</Text>
            <Text className="text-gray-400 text-[12px]">{playersList.length} Available</Text>
          </View>

          {/* Player List */}
          {isLoadingAthletes ? (
            <ActivityIndicator color="#8B3DFF" size="large" style={{ marginVertical: 30 }} />
          ) : (
            playersList.map((player: any) => (
              <TouchableOpacity
                key={player.id}
                className="flex-row items-center justify-between bg-[#141414] border border-[#262626] p-3.5 rounded-2xl mb-3"
                activeOpacity={0.8}
                disabled={isDrafting}
                onPress={async () => {
                  const seasonAthleteId =
                    typeof player.seasonAthleteId === 'string'
                      ? player.seasonAthleteId
                      : player.seasonAthleteId?._id ||
                        player.seasonAthleteId?.id ||
                        player.rawItem?.seasonAthleteId?._id ||
                        player.rawItem?.seasonAthleteId ||
                        player._id ||
                        player.id;

                  if (!leagueId || !userTeamId) {
                    Alert.alert(
                      'Not Joined Yet',
                      'You must join this league to pick draft players.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Join League Now',
                          onPress: async () => {
                            try {
                              const defaultName = `Team ${((apiMembersData as any)?.length || 0) + 1}`;
                              const joined: any = await joinLeagueMutation({ id: leagueId, fantasyTeamName: defaultName }).unwrap();
                              const newTeamId = joined?.team?._id || joined?.team?.id || joined?._id;
                              if (newTeamId) {
                                dispatch(setActiveTeam({ leagueId, teamId: String(newTeamId) }));
                                showToast.success('Joined Successfully!', `Joined as "${defaultName}". Please tap Draft again.`);
                              }
                            } catch (e: any) {
                              showToast.error('Join Error', e?.data?.message || 'Failed to join league.');
                            }
                          },
                        },
                      ]
                    );
                    return;
                  }
                  try {
                    await draftPick({ leagueId, teamId: userTeamId, seasonAthleteId: String(seasonAthleteId), acquisitionCost: 0 }).unwrap();
                    showToast.success('Draft Pick Success!', `${player.name} was drafted to your team.`);
                    if (refetchAvailableAthletes) refetchAvailableAthletes();
                  } catch (err: any) {
                    const msg = err?.data?.message || err?.message || 'Failed to draft player.';
                    showToast.error('Draft Error', msg);
                  }
                }}
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <Image source={{ uri: player.avatarUri }} className="w-11 h-11 rounded-full bg-[#222] border border-[#333] mr-3" />
                  <View className="flex-1">
                    <Text className="text-white text-[15px] font-semibold mb-0.5" numberOfLines={1}>{player.name}</Text>
                    <Text className="text-gray-400 text-[12px]">Rostered: {player.rostered}</Text>
                  </View>
                </View>
                <View className="bg-[#8B3DFF]/20 px-3 py-1.5 rounded-xl border border-[#8B3DFF]/40">
                  <Text className="text-[#8B3DFF] text-[13px] font-bold">Draft</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Set Player Modal */}
      <Modal
        visible={setPlayerModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSetPlayerModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/80">
          <View className="w-full h-[80%] bg-[#1a1a1a] border-t border-[#333] rounded-t-[32px] p-6">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-5 pb-4 border-b border-[#333]">
              <Text className="text-white text-[20px] font-bold">Select Draft Player</Text>
              <TouchableOpacity
                className="px-3 py-1.5 rounded-full bg-[#2b2b2b]"
                onPress={() => setSetPlayerModalVisible(false)}
              >
                <Text className="text-gray-300 text-xs font-semibold">Close</Text>
              </TouchableOpacity>
            </View>

            {/* Player List */}
            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              {playersList.map((player: any) => (
                <TouchableOpacity
                  key={player.id}
                  className="flex-row items-center justify-between bg-[#242424] border border-[#333] p-3.5 rounded-2xl mb-3"
                  activeOpacity={0.7}
                  disabled={isDrafting}
                  onPress={async () => {
                    const seasonAthleteId =
                      typeof player.seasonAthleteId === 'string'
                        ? player.seasonAthleteId
                        : player.seasonAthleteId?._id ||
                          player.seasonAthleteId?.id ||
                          player.rawItem?.seasonAthleteId?._id ||
                          player.rawItem?.seasonAthleteId ||
                          player._id ||
                          player.id;

                    if (!leagueId || !userTeamId) {
                      Alert.alert(
                        'Not Joined Yet',
                        'You must join this league to pick draft players.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Join League Now',
                            onPress: async () => {
                              try {
                                const defaultName = `Team ${((apiMembersData as any)?.length || 0) + 1}`;
                                const joined: any = await joinLeagueMutation({ id: leagueId, fantasyTeamName: defaultName }).unwrap();
                                const newTeamId = joined?.team?._id || joined?.team?.id || joined?._id;
                                if (newTeamId) {
                                  dispatch(setActiveTeam({ leagueId, teamId: String(newTeamId) }));
                                  showToast.success('Joined Successfully!', `Joined as "${defaultName}". Please tap Pick again.`);
                                }
                              } catch (e: any) {
                                showToast.error('Join Error', e?.data?.message || 'Failed to join league.');
                              }
                            },
                          },
                        ]
                      );
                      return;
                    }
                    try {
                      await draftPick({ leagueId, teamId: userTeamId, seasonAthleteId: String(seasonAthleteId), acquisitionCost: 0 }).unwrap();
                      setSetPlayerModalVisible(false);
                      showToast.success('Draft Pick Success!', `${player.name} was drafted to your team.`);
                      if (refetchAvailableAthletes) refetchAvailableAthletes();
                    } catch (err: any) {
                      const msg = err?.data?.message || err?.message || 'Failed to draft player.';
                      showToast.error('Draft Error', msg);
                    }
                  }}
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <Image source={{ uri: player.avatarUri }} className="w-12 h-12 rounded-full bg-[#333] mr-3" />
                    <View className="flex-1">
                      <Text className="text-white text-[15px] font-semibold mb-0.5" numberOfLines={1}>{player.name}</Text>
                      <Text className="text-gray-400 text-[12px]">Rostered {player.rostered}</Text>
                    </View>
                  </View>
                  <View className="bg-[#8B3DFF] px-4 py-2 rounded-xl">
                    <Text className="text-white text-[13px] font-bold">Pick</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

