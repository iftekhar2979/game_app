import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MoreVertical, UserCheck, Plus, Users } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useGetLeagueDetailsQuery, useGetLeagueMembersQuery, useJoinLeagueMutation } from '../../store/api/leagueApi';
import { MatchupTab, DraftTab, TeamTab, PlayersTab, LeagueTab } from '../../components/LeagueDetail/LeagueDetailTabs';
import { AddTeamModal, PlayerDetailModal, LeagueSettingsModal, LeagueSettingsSubModal, RosterSettingsSubModal, MemberSettingsSubModal, GiveCommissionerAccessModal, LockRosterModal, DeleteLeagueModal, JoinLeagueModal } from '../../components/LeagueDetail/LeagueDetailModals';


type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'LeagueDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'LeagueDetail'>;

const MOCK_LEAGUES: any[] = [
  { id: 'mock-1', name: '2026 Final cheer', membersCount: 10, status: 'Draft' },
  { id: 'mock-2', name: '2026 Final cheer', membersCount: 12, status: 'Draft' },
  { id: 'mock-3', name: '2026 Final cheer', membersCount: 8, status: 'Play' },
];

interface TeamMember {
  id: string;
  name: string;
  handle: string;
  avatarUri?: string;
}

const MOCK_TEAM_MEMBERS: TeamMember[] = [
  { id: 't1', name: 'Team Cheerleading', handle: '@cheerleading' },
  { id: 't2', name: 'Team Rubel', handle: '@rubel' },
  { id: 't3', name: 'Team Okafor', handle: '@okafor' },
  { id: 't4', name: 'Team Walter', handle: '@walter' },
  { id: 't5', name: 'Team Noah', handle: '@noah' },
  { id: 't6', name: 'Team Leo', handle: '@leo' },
];

const MOCK_PLAYERS_LIST = [
  { id: 'p1', name: 'Noah Okafor', rostered: '17%', points: '+10', progress: 17, avatarUri: 'https://i.pravatar.cc/150?img=12' },
  { id: 'p2', name: 'Leonardo Trossard', rostered: '32%', points: '+9', progress: 32, avatarUri: 'https://i.pravatar.cc/150?img=13' },
  { id: 'p3', name: 'Walter bentiez', rostered: '4%', points: '+5', progress: 4, avatarUri: 'https://i.pravatar.cc/150?img=14' },
  { id: 'p4', name: '2026 Final cheer', rostered: '1%', points: '+3', progress: 1, avatarUri: 'https://i.pravatar.cc/150?img=15' },
];

const MOCK_LEAGUE_STANDINGS = [
  { id: 'l1', name: 'Team Cheerleading', handle: '@cheerleading', score: '0 - 0' },
  { id: 'l2', name: 'Team Cheerleading', handle: '@cheerleading', score: '0 - 0' },
  { id: 'l3', name: 'Team Cheerleading', handle: '@cheerleading', score: '0 - 0' },
];

const MOCK_MATCHUPS = [
  {
    id: 'm1',
    team1: { name: 'Team david', handle: '@david', percentage: '50 %', score: '0 - 0' },
    team2: { name: 'Team thomas', handle: '@thomas', percentage: '50 %', score: '0 - 0' },
  },
];

const MOCK_STARTERS = [
  { id: 's1', name: 'Diana', points: '34.0', time: 'Mon 11:00 AM', avatarUri: 'https://i.pravatar.cc/150?img=1' },
  { id: 's2', name: 'Alvela', points: '34.0', time: 'Mon 11:00 AM', avatarUri: 'https://i.pravatar.cc/150?img=2' },
  { id: 's3', name: 'Isabella', points: '34.0', time: 'Mon 11:00 AM', avatarUri: 'https://i.pravatar.cc/150?img=3' },
  { id: 's4', name: 'Siko', points: '34.0', time: 'Mon 11:00 AM', avatarUri: 'https://i.pravatar.cc/150?img=4' },
  { id: 's5', name: 'Loria', points: '34.0', time: 'Mon 11:00 AM', avatarUri: 'https://i.pravatar.cc/150?img=5' },
  { id: 's6', name: 'Ukio', points: '34.0', time: 'Mon 11:00 AM', avatarUri: 'https://i.pravatar.cc/150?img=6' },
  { id: 's7', name: 'Petra', points: '34.0', time: 'Mon 11:00 AM', avatarUri: 'https://i.pravatar.cc/150?img=7' },
  { id: 's8', name: 'Levoe', points: '34.0', time: 'Mon 11:00 AM', avatarUri: 'https://i.pravatar.cc/150?img=8' },
  { id: 's9', name: 'Savia', points: '34.0', time: 'Mon 11:00 AM', avatarUri: 'https://i.pravatar.cc/150?img=9' },
  { id: 's10', name: 'Oranius', points: '34.0', time: 'Mon 11:00 AM', avatarUri: 'https://i.pravatar.cc/150?img=10' },
];

export default function LeagueDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { leagueId } = route.params;

  // Fetch real API league data if leagueId is an API ID
  const isMockId = !leagueId || leagueId.startsWith('mock-');
  const { data: apiLeagueData, isLoading: isApiLoading, refetch: refetchLeagueDetails } = useGetLeagueDetailsQuery(leagueId, {
    skip: isMockId,
  });
  const { data: apiMembersData, refetch: refetchMembers } = useGetLeagueMembersQuery(leagueId, {
    skip: isMockId,
  });
  const [joinLeagueMutation, { isLoading: isJoiningLeague }] = useJoinLeagueMutation();

  const callerInfo = apiLeagueData?.caller;

  const createdLeagues = useSelector((state: RootState) => state.league.leagues);
  const localLeague: any = createdLeagues.find(l => l.id === leagueId) || MOCK_LEAGUES.find(l => l.id === leagueId) || MOCK_LEAGUES[0];

  const rawLeague = apiLeagueData?.league || apiLeagueData;
  const draftStartsAt =
    rawLeague?.draftStartsAt ||
    rawLeague?.settings?.draftSettings?.draftStartsAt ||
    localLeague?.draftDate ||
    localLeague?.draftStartsAt;

  const league = rawLeague
    ? {
        id: rawLeague._id || rawLeague.id || leagueId,
        name: rawLeague.name || localLeague?.name || 'Fantasy League',
        logoUri:
          rawLeague.logoUri ||
          rawLeague.logoUrl ||
          localLeague?.logoUri ||
          'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=150&auto=format&fit=crop',
        membersCount: rawLeague.joinedTeamCount ?? rawLeague.maxTeams ?? localLeague?.membersCount ?? 8,
        maxTeams: rawLeague.maxTeams ?? 12,
        status:
          rawLeague.status === 'registration_open' || rawLeague.status === 'drafting'
            ? 'Draft'
            : rawLeague.status || localLeague?.status || 'Draft',
        code: rawLeague.code || '',
        description: rawLeague.description || '',
        visibility: rawLeague.visibility || 'public',
        draftStartsAt,
      }
    : localLeague;

  const [currentLeagueStatus, setCurrentLeagueStatus] = useState(league?.status);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [isDraftStarted, setIsDraftStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<'Matchup' | 'Draft' | 'Team' | 'Players' | 'League'>(currentLeagueStatus === 'Play' ? 'Matchup' : 'Draft');

  const [isUserJoined, setIsUserJoined] = useState(false);
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const [joinErrorText, setJoinErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (league?.status) {
      setCurrentLeagueStatus(league.status);
    }
  }, [league?.status]);

  useEffect(() => {
    if (callerInfo?.isMember !== undefined) {
      setIsUserJoined(callerInfo.isMember);
    }
  }, [callerInfo?.isMember]);

  const [teamSlots, setTeamSlots] = useState<(TeamMember | null)[]>(() => {
    const slots = new Array(league?.maxTeams || 8).fill(null);
    slots[0] = MOCK_TEAM_MEMBERS[0];
    slots[1] = MOCK_TEAM_MEMBERS[1];
    return slots;
  });

  const [isAddTeamModalVisible, setIsAddTeamModalVisible] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  const [isPlayerModalVisible, setIsPlayerModalVisible] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isLeagueSettingsSubModalVisible, setIsLeagueSettingsSubModalVisible] = useState(false);
  const [isRosterSettingsSubModalVisible, setIsRosterSettingsSubModalVisible] = useState(false);
  const [isMemberSettingsSubModalVisible, setIsMemberSettingsSubModalVisible] = useState(false);
  const [isCommissionerModalVisible, setIsCommissionerModalVisible] = useState(false);
  const [isLockRosterModalVisible, setIsLockRosterModalVisible] = useState(false);
  const [isDeleteLeagueModalVisible, setIsDeleteLeagueModalVisible] = useState(false);

  const handleSettingsOptionSelect = (optionTitle: string) => {
    if (optionTitle === 'League settings') {
      setIsLeagueSettingsSubModalVisible(true);
    } else if (optionTitle === 'Roster settings') {
      setIsRosterSettingsSubModalVisible(true);
    } else if (optionTitle === 'Member settings') {
      setIsMemberSettingsSubModalVisible(true);
    } else if (optionTitle === 'Commissioner control') {
      setIsCommissionerModalVisible(true);
    } else if (optionTitle === 'Team settings') {
      setIsLockRosterModalVisible(true);
    } else if (optionTitle === 'Delete league') {
      setIsDeleteLeagueModalVisible(true);
    }
  };

  const handleAddTeam = (team: TeamMember) => {
    if (selectedSlotIndex !== null) {
      const newSlots = [...teamSlots];
      newSlots[selectedSlotIndex] = team;
      setTeamSlots(newSlots);
      setIsAddTeamModalVisible(false);
    }
  };

  const handleJoinLeague = async (fantasyTeamName: string) => {
    try {
      setJoinErrorText(null);
      if (!isMockId) {
        await joinLeagueMutation({ id: leagueId, fantasyTeamName }).unwrap();
        if (refetchLeagueDetails) refetchLeagueDetails();
        if (refetchMembers) refetchMembers();
      }
      const newSlots = [...teamSlots];
      const emptyIndex = newSlots.findIndex(s => s === null);
      const targetIndex = selectedSlotIndex !== null && newSlots[selectedSlotIndex] === null ? selectedSlotIndex : (emptyIndex !== -1 ? emptyIndex : 0);
      newSlots[targetIndex] = {
        id: `my-team-${Date.now()}`,
        name: fantasyTeamName,
        handle: `@${fantasyTeamName.toLowerCase().replace(/\s+/g, '')}`,
      };
      setTeamSlots(newSlots);
      setIsUserJoined(true);
      setIsJoinModalVisible(false);
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to join league. Please try again.';
      setJoinErrorText(msg);
    }
  };


  useEffect(() => {
    const rawTarget =
      league?.draftStartsAt ||
      league?.settings?.draftSettings?.draftStartsAt ||
      league?.draftDate;

    if (!rawTarget) {
      setTimeLeft(null);
      setIsDraftStarted(false);
      return;
    }

    const targetTime = new Date(rawTarget).getTime();

    const calculateTime = () => {
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsDraftStarted(true);
        if (currentLeagueStatus !== 'Play') {
          setCurrentLeagueStatus('Play');
          setActiveTab('Matchup');
        }
        return;
      }

      setIsDraftStarted(false);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTime();
    const intervalId = setInterval(calculateTime, 1000);

    return () => clearInterval(intervalId);
  }, [league?.draftStartsAt, league?.settings?.draftSettings?.draftStartsAt, league?.draftDate, currentLeagueStatus]);

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2.5 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="w-11 h-11 rounded-xl border border-[#333] justify-center items-center mr-4"
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-[22px] font-semibold">Fantasy</Text>
        </View>
      </View>

      {isApiLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#E0B566" />
          <Text className="text-gray-400 text-xs mt-3">Loading League Details...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
          {/* League Info Row */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center flex-1 mr-2">
              <Image
                source={{ uri: league.logoUri || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=150&auto=format&fit=crop' }}
                className="w-[50px] h-[50px] rounded-full bg-white mr-3"
              />
              <View className="flex-1">
                <Text className="text-white text-[18px] font-semibold" numberOfLines={1}>{league.name}</Text>
                <View className="flex-row items-center mt-1 flex-wrap">
                  <Text className="text-[#E0B566] text-xs font-medium mr-2">{league.membersCount || 8} teams</Text>
                  <Text className="text-[#8B3DFF] text-xs font-medium">({league.status === 'Draft' ? 'Pre draft' : league.status})</Text>
                  {league.code ? (
                    <Text className="text-gray-400 text-xs font-medium ml-2">Code: {league.code}</Text>
                  ) : null}
                </View>
              </View>
            </View>
            <TouchableOpacity className="p-2" onPress={() => setIsSettingsModalVisible(true)}>
              <MoreVertical color="#fff" size={20} />
            </TouchableOpacity>
          </View>

          {/* Join Public League Banner */}
          {!isUserJoined ? (
            <View className="bg-[#1a132b] border border-[#8B3DFF] rounded-2xl p-4 mb-6 flex-row items-center justify-between shadow-lg">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-1">
                  <Users color="#E0B566" size={15} className="mr-1.5" />
                  <Text className="text-[#E0B566] text-[11px] font-bold tracking-wider">PUBLIC LEAGUE</Text>
                </View>
                <Text className="text-white text-[15px] font-bold">Open Registration!</Text>
                <Text className="text-gray-300 text-[12px] mt-0.5">Join this public league with your team.</Text>
              </View>
              <TouchableOpacity
                className="bg-[#8B3DFF] px-4 py-2.5 rounded-full flex-row items-center"
                activeOpacity={0.9}
                onPress={() => {
                  setJoinErrorText(null);
                  setIsJoinModalVisible(true);
                }}
              >
                <Plus color="#fff" size={16} className="mr-1" />
                <Text className="text-white text-[13px] font-bold">Join League</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-emerald-950/70 border border-emerald-500/40 rounded-xl px-4 py-2.5 mb-6 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <UserCheck color="#34d399" size={16} className="mr-2" />
                <Text className="text-emerald-300 text-[13px] font-semibold">Your team has joined this league</Text>
              </View>
              <TouchableOpacity
                className="bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-500/30"
                onPress={() => setActiveTab('Team')}
              >
                <Text className="text-emerald-200 text-[11px] font-bold">View Team</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tabs */}
          <View className="flex-row justify-between items-center mb-6 px-1">
            {currentLeagueStatus === 'Play' ? (
              <TouchableOpacity
                className={`${activeTab === 'Matchup' ? 'bg-[#FFB84D]' : 'bg-transparent'} px-5 py-2 rounded-xl`}
                onPress={() => setActiveTab('Matchup')}
              >
                <Text className={`${activeTab === 'Matchup' ? 'text-white' : 'text-gray-400'} text-[15px] font-semibold`}>Matchup</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className={`${activeTab === 'Draft' ? 'bg-[#FFB84D]' : 'bg-transparent'} px-5 py-2 rounded-xl`}
                onPress={() => setActiveTab('Draft')}
              >
                <Text className={`${activeTab === 'Draft' ? 'text-white' : 'text-gray-400'} text-[15px] font-semibold`}>Draft</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className={`${activeTab === 'Team' ? 'bg-[#FFB84D]' : 'bg-transparent'} px-5 py-2 rounded-xl`}
              onPress={() => setActiveTab('Team')}
            >
              <Text className={`${activeTab === 'Team' ? 'text-white' : 'text-gray-400'} text-[15px] font-semibold`}>Team</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`${activeTab === 'Players' ? 'bg-[#FFB84D]' : 'bg-transparent'} px-3 py-2 rounded-xl`}
              onPress={() => setActiveTab('Players')}
            >
              <Text className={`${activeTab === 'Players' ? 'text-white' : 'text-gray-400'} text-[15px] font-semibold`}>Players</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`${activeTab === 'League' ? 'bg-[#FFB84D]' : 'bg-transparent'} px-3 py-2 rounded-xl`}
              onPress={() => setActiveTab('League')}
            >
              <Text className={`${activeTab === 'League' ? 'text-white' : 'text-gray-400'} text-[15px] font-semibold`}>League</Text>
            </TouchableOpacity>
          </View>

          {/* Matchup Tab Content */}
          {activeTab === 'Matchup' && currentLeagueStatus === 'Play' && (
            <MatchupTab
              matchup={MOCK_MATCHUPS[0]}
              starters={MOCK_STARTERS}
            />
          )}

          {/* Draft Tab Content */}
          {activeTab === 'Draft' && currentLeagueStatus !== 'Play' && (
            <DraftTab
              isDraftStarted={isDraftStarted}
              timeLeft={timeLeft}
              league={league}
              navigation={navigation}
            />
          )}

          {/* Team Tab Content */}
          {activeTab === 'Team' && (
            <TeamTab
              teamSlots={teamSlots}
              setSelectedSlotIndex={setSelectedSlotIndex}
              setIsAddTeamModalVisible={setIsAddTeamModalVisible}
              isMember={isUserJoined}
              onOpenJoinModal={() => {
                setJoinErrorText(null);
                setIsJoinModalVisible(true);
              }}
              maxTeams={league.maxTeams || 8}
            />
          )}

          {/* Players Tab Content */}
          {activeTab === 'Players' && (
            <PlayersTab
              playersList={MOCK_PLAYERS_LIST}
              setSelectedPlayer={setSelectedPlayer}
              setIsPlayerModalVisible={setIsPlayerModalVisible}
            />
          )}

          {/* League Tab Content */}
          {activeTab === 'League' && (
            <LeagueTab leagueStandings={MOCK_LEAGUE_STANDINGS} matchups={MOCK_MATCHUPS} />
          )}
        </ScrollView>
      )}

      {/* Join League Modal */}
      <JoinLeagueModal
        isVisible={isJoinModalVisible}
        onClose={() => setIsJoinModalVisible(false)}
        onJoin={handleJoinLeague}
        isLoading={isJoiningLeague}
        leagueName={league?.name}
        errorText={joinErrorText}
      />

      {/* Add Team Modal */}
      <AddTeamModal
        isVisible={isAddTeamModalVisible}
        onClose={() => setIsAddTeamModalVisible(false)}
        teamMembers={MOCK_TEAM_MEMBERS}
        onAddTeam={handleAddTeam}
      />

      {/* Player Detail Modal */}
      <PlayerDetailModal
        isVisible={isPlayerModalVisible}
        onClose={() => setIsPlayerModalVisible(false)}
        selectedPlayer={selectedPlayer}
      />

      {/* Settings Modal */}
      <LeagueSettingsModal
        isVisible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
        onOptionSelect={handleSettingsOptionSelect}
      />

      <LeagueSettingsSubModal
        isVisible={isLeagueSettingsSubModalVisible}
        onClose={() => setIsLeagueSettingsSubModalVisible(false)}
      />

      <RosterSettingsSubModal
        isVisible={isRosterSettingsSubModalVisible}
        onClose={() => setIsRosterSettingsSubModalVisible(false)}
      />

      <MemberSettingsSubModal
        isVisible={isMemberSettingsSubModalVisible}
        onClose={() => setIsMemberSettingsSubModalVisible(false)}
      />

      <GiveCommissionerAccessModal
        isVisible={isCommissionerModalVisible}
        onClose={() => setIsCommissionerModalVisible(false)}
      />

      <LockRosterModal
        isVisible={isLockRosterModalVisible}
        onClose={() => setIsLockRosterModalVisible(false)}
      />

      <DeleteLeagueModal
        isVisible={isDeleteLeagueModalVisible}
        onClose={() => setIsDeleteLeagueModalVisible(false)}
        onDelete={() => {
          setIsDeleteLeagueModalVisible(false);
          navigation.goBack();
        }}
      />

    </SafeAreaView>
  );
}
