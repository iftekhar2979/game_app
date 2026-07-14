import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MoreVertical } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { DraftTab, TeamTab, PlayersTab, LeagueTab } from '../../components/LeagueDetail/LeagueDetailTabs';
import { AddTeamModal, PlayerDetailModal, LeagueSettingsModal, LeagueSettingsSubModal, RosterSettingsSubModal, MemberSettingsSubModal, GiveCommissionerAccessModal, LockRosterModal, DeleteLeagueModal } from '../../components/LeagueDetail/LeagueDetailModals';

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
  { id: 'l1', name: 'Team FSD', handle: '@fsd', points: '+10.9', progress: 100 },
  { id: 'l2', name: 'Team Cheerleading', handle: '@cheerleading', points: '+9', progress: 80 },
  { id: 'l3', name: 'Team Rubel', handle: '@rubel', points: '+5', progress: 50 },
  { id: 'l4', name: 'Team alex', handle: '@alex', points: '+3', progress: 30 },
];

export default function LeagueDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { leagueId } = route.params;

  // Retrieve league data
  const createdLeagues = useSelector((state: RootState) => state.league.leagues);
  const league: any = createdLeagues.find(l => l.id === leagueId) || MOCK_LEAGUES.find(l => l.id === leagueId) || MOCK_LEAGUES[0];

  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [isDraftStarted, setIsDraftStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<'Draft' | 'Team' | 'Players' | 'League'>('Draft');

  const [teamSlots, setTeamSlots] = useState<(TeamMember | null)[]>(() => {
    const slots = new Array(league?.membersCount || 8).fill(null);
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
      // Wiring team settings to lock roster for now as requested design
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

  useEffect(() => {
    if (!league?.draftDate || !league?.draftTime) return;

    const dDate = new Date(league.draftDate);
    const tTime = new Date(league.draftTime);
    dDate.setHours(tTime.getHours(), tTime.getMinutes(), 0, 0);
    const targetTime = dDate.getTime();

    const calculateTime = () => {
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsDraftStarted(true);
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
  }, [league?.draftDate, league?.draftTime]);

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

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
        {/* League Info Row */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center">
            <Image
              source={{ uri: league.logoUri || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=150&auto=format&fit=crop' }}
              className="w-[50px] h-[50px] rounded-full bg-white mr-3"
            />
            <View>
              <Text className="text-white text-[18px] font-normal">{league.name}</Text>
              <View className="flex-row items-center mt-1">
                <Text className="text-[#E0B566] text-xs font-medium mr-2">{league.membersCount || 8} team</Text>
                <Text className="text-[#8B3DFF] text-xs font-medium">( Pre draft )</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity className="p-2" onPress={() => setIsSettingsModalVisible(true)}>
            <MoreVertical color="#fff" size={20} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View className="flex-row justify-between items-center mb-6 px-1">
          <TouchableOpacity
            className={`${activeTab === 'Draft' ? 'bg-[#FFB84D]' : 'bg-transparent'} px-5 py-2 rounded-xl`}
            onPress={() => setActiveTab('Draft')}
          >
            <Text className={`${activeTab === 'Draft' ? 'text-white' : 'text-gray-400'} text-[15px] font-semibold`}>Draft</Text>
          </TouchableOpacity>
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

        {/* Draft Tab Content */}
        {activeTab === 'Draft' && (
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
          <LeagueTab leagueStandings={MOCK_LEAGUE_STANDINGS} />
        )}
      </ScrollView>

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
