import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MoreVertical } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

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
          <TouchableOpacity className="p-2">
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
          <View>
            {/* Draftboard Card */}
            {!isDraftStarted ? (
              <View className="bg-[#FFB84D] rounded-[24px] p-5 mb-8">
                <Text className="text-black text-center text-[16px] font-medium mb-1">Draftboard</Text>
                <Text className="text-black text-center text-[12px] opacity-80 mb-6">
                  {league?.draftDate && league?.draftTime
                    ? `${new Date(league.draftDate).toDateString()} ${new Date(league.draftTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Draft time not scheduled'}
                </Text>

                {/* Countdown */}
                {timeLeft ? (
                  <View className="flex-row justify-center items-center mb-6">
                    <View className="items-center mx-1 flex-row">
                      <Text className="text-black text-[20px] font-bold mr-1">{timeLeft.days}</Text>
                      <Text className="text-black text-[10px] mt-1 mr-2 opacity-80">Day</Text>
                      <Text className="text-black text-[18px] font-bold mr-2">:</Text>
                    </View>
                    <View className="items-center mx-1 flex-row">
                      <Text className="text-black text-[20px] font-bold mr-1">{timeLeft.hours}</Text>
                      <Text className="text-black text-[10px] mt-1 mr-2 opacity-80">Hours</Text>
                      <Text className="text-black text-[18px] font-bold mr-2">:</Text>
                    </View>
                    <View className="items-center mx-1 flex-row">
                      <Text className="text-black text-[20px] font-bold mr-1">{timeLeft.minutes}</Text>
                      <Text className="text-black text-[10px] mt-1 mr-2 opacity-80">Min</Text>
                      <Text className="text-black text-[18px] font-bold mr-2">:</Text>
                    </View>
                    <View className="items-center mx-1 flex-row">
                      <Text className="text-black text-[20px] font-bold mr-1">{timeLeft.seconds}</Text>
                      <Text className="text-black text-[10px] mt-1 opacity-80">sec</Text>
                    </View>
                  </View>
                ) : (
                  <View className="flex-row justify-center items-center mb-6 h-[40px]">
                    <Text className="text-black text-[16px] font-bold opacity-70">00 : 00 : 00 : 00</Text>
                  </View>
                )}

                <TouchableOpacity
                  className="bg-[#8B3DFF] rounded-full h-[50px] justify-center items-center mx-8"
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('DraftRoom', { leagueId: league.id })}
                >
                  <Text className="text-white text-[16px] font-medium">Draftroom</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="bg-[#8B3DFF] rounded-[24px] p-6 mb-8 justify-center items-center border border-[#B366FF]">
                <Text className="text-white text-center text-[22px] font-bold mb-2">Game Started!</Text>
                <Text className="text-white/80 text-center text-[14px] mb-6">The draft has begun. Join your league now.</Text>
                <TouchableOpacity
                  className="bg-white rounded-full h-[50px] justify-center items-center px-8 w-[80%]"
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('DraftRoom', { leagueId: league.id })}
                >
                  <Text className="text-[#8B3DFF] text-[16px] font-bold">Enter Draft</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Invite Friends Section */}
            <View className="mb-8">
              <Text className="text-white text-[16px] font-medium mb-1">Invite friends to play</Text>
              <Text className="text-gray-400 text-[12px] mb-4">Copy the link and share with your friends</Text>
              <View className="flex-row items-center border border-[#8B3DFF] rounded-[16px] h-[52px] px-4 relative">
                <Text className="text-[#E0B566] text-[13px]" numberOfLines={1}>https://sleeper.com/i/QB89ndAq6MJ2P</Text>
                <TouchableOpacity className="absolute right-2 border border-[#8B3DFF] rounded-[12px] px-4 py-2">
                  <Text className="text-[#8B3DFF] text-[13px] font-medium">Copy</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* QR Code Section */}
            <View className="mb-10 items-center">
              <Text className="text-white text-[18px] font-medium mb-6">Scan QR code to join</Text>
              <View className="bg-white p-4 rounded-[24px]">
                {/* Mock QR Code Image */}
                <Image
                  source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg' }}
                  className="w-[180px] h-[180px]"
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
        )}

        {/* Team Tab Content */}
        {activeTab === 'Team' && (
          <View className="mb-4 mt-2">
            {teamSlots.map((team, index) => {
              if (team) {
                return (
                  <View key={`slot-${index}`} className="flex-row items-center border-b border-[#222] pb-4 mb-4">
                    <View className="w-12 h-12 rounded-full border border-[#333] justify-center items-center bg-black mr-4">
                      <Text className="text-[#8B3DFF] text-[10px] font-bold">CHEER</Text>
                    </View>
                    <View>
                      <Text className="text-white text-[15px] mb-1">{team.name}</Text>
                      <Text className="text-[#E0B566] text-[13px]">{team.handle}</Text>
                    </View>
                  </View>
                );
              } else {
                return (
                  <TouchableOpacity
                    key={`slot-${index}`}
                    className="flex-row items-center border-b border-[#222] pb-4 mb-4"
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedSlotIndex(index);
                      setIsAddTeamModalVisible(true);
                    }}
                  >
                    <View className="w-12 h-12 rounded-full border border-[#333] justify-center items-center bg-black mr-4">
                      <Text className="text-gray-400 text-[15px] font-medium">{index + 1}</Text>
                    </View>
                    <Text className="text-white text-[15px]">Empty</Text>
                  </TouchableOpacity>
                );
              }
            })}
          </View>
        )}

        {/* Players Tab Content */}
        {activeTab === 'Players' && (
          <View className="mb-4 mt-2">
            {/* Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
              <TouchableOpacity className="border border-[#FFB84D] rounded-full px-4 py-1.5 mr-4 justify-center items-center">
                <Text className="text-[#FFB84D] text-[12px] font-medium">New</Text>
              </TouchableOpacity>
              <TouchableOpacity className="mr-5 justify-center">
                <Text className="text-gray-400 text-[12px]">All</Text>
              </TouchableOpacity>

            </ScrollView>

            {/* Players List */}
            {MOCK_PLAYERS_LIST.map((player) => (
              <TouchableOpacity 
                key={player.id} 
                className="flex-row items-center justify-between border-b border-[#222] pb-4 mb-4"
                activeOpacity={0.7}
                onPress={() => {
                  setSelectedPlayer(player);
                  setIsPlayerModalVisible(true);
                }}
              >
                <View className="flex-row items-center">
                  <Image source={{ uri: player.avatarUri }} className="w-11 h-11 rounded-full mr-4 bg-[#333]" />
                  <View>
                    <Text className="text-white text-[15px] mb-1">{player.name}</Text>
                    <Text className="text-[#FFB84D] text-[12px]">Rostered {player.rostered}</Text>
                  </View>
                </View>
                
                <View className="items-end justify-center w-[60px]">
                  <Text className="text-[#FFB84D] text-[14px] font-medium mb-1.5">{player.points}</Text>
                  <View className="w-full h-1 bg-[#333] rounded-full overflow-hidden">
                    <View className="h-full bg-[#FFB84D]" style={{ width: `${player.progress}%` }} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Team Modal */}
      <Modal
        visible={isAddTeamModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAddTeamModalVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/80 justify-end"
          activeOpacity={1}
          onPress={() => setIsAddTeamModalVisible(false)}
        >
          <View className="bg-[#1a1a1a] rounded-t-[32px] p-6 border-t border-[#333] h-[60%] w-full">
            <Text className="text-white text-[20px] font-semibold mb-6">Select a team to add</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {MOCK_TEAM_MEMBERS.map((team) => (
                <TouchableOpacity
                  key={team.id}
                  className="flex-row items-center border-b border-[#333] pb-4 mb-4"
                  onPress={() => handleAddTeam(team)}
                >
                  <View className="w-12 h-12 rounded-full border border-[#B366FF] justify-center items-center bg-[#0a0a0a] mr-4">
                    <Text className="text-[#8B3DFF] text-[10px] font-bold">CHEER</Text>
                  </View>
                  <View>
                    <Text className="text-white text-[16px] mb-1">{team.name}</Text>
                    <Text className="text-[#E0B566] text-[14px]">{team.handle}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Player Detail Modal */}
      <Modal
        visible={isPlayerModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPlayerModalVisible(false)}
      >
        <View className="flex-1 bg-black/80 justify-center items-center px-3">
          <View className="w-full bg-[#1e1e1e] rounded-[16px] overflow-hidden border border-[#333]">
            {/* Blue Header Section */}
            <View className="bg-[#0b3887] px-4 pt-4 pb-3 relative">
              <View className="flex-row justify-between items-start mb-2">
                <TouchableOpacity onPress={() => setIsPlayerModalVisible(false)} className="p-1 -ml-1">
                  <ChevronLeft color="#fff" size={24} />
                </TouchableOpacity>
                <TouchableOpacity className="bg-white/20 rounded-full px-4 py-1.5 flex-row items-center border border-white/30">
                  <Text className="text-white text-[12px] font-bold">+ ADD</Text>
                </TouchableOpacity>
              </View>

              {/* Player Header Info */}
              <View className="flex-row items-center mb-5">
                <Image 
                  source={{ uri: selectedPlayer?.avatarUri || 'https://i.pravatar.cc/150?img=11' }} 
                  className="w-16 h-16 rounded-full border-2 border-[#1e1e1e] mr-3 bg-white"
                />
                <View>
                  <Text className="text-white text-[22px] font-bold">{selectedPlayer?.name || 'Josh Allen'}</Text>
                  <View className="flex-row items-center mt-1">
                    <View className="bg-[#ff2a5f] px-1.5 py-0.5 rounded mr-2">
                      <Text className="text-white text-[10px] font-bold">QB</Text>
                    </View>
                    <Text className="text-white text-[12px] font-medium">BILLS #17</Text>
                  </View>
                </View>
              </View>

              {/* Stats Row */}
              <View className="flex-row justify-between mb-4 px-1">
                <View><Text className="text-[#88b0ff] text-[9px] mb-1">AGE</Text><Text className="text-white text-[14px] font-bold">30</Text></View>
                <View><Text className="text-[#88b0ff] text-[9px] mb-1">HEIGHT</Text><Text className="text-white text-[14px] font-bold">6'5"</Text></View>
                <View><Text className="text-[#88b0ff] text-[9px] mb-1">WEIGHT</Text><Text className="text-white text-[14px] font-bold">237<Text className="text-[10px] font-normal"> lbs</Text></Text></View>
                <View><Text className="text-[#88b0ff] text-[9px] mb-1">EXP</Text><Text className="text-white text-[14px] font-bold">8</Text></View>
                <View><Text className="text-[#88b0ff] text-[9px] mb-1">COLLEGE</Text><Text className="text-white text-[14px] font-bold">Wyoming</Text></View>
              </View>

              {/* Rankings Row */}
              <View className="flex-row justify-between border-t border-[#1a4baf] pt-3 px-1">
                <View className="flex-row items-center"><Text className="text-white font-bold text-[14px] mr-1">#1</Text><Text className="text-[#88b0ff] text-[9px] font-bold">QB</Text></View>
                <View className="flex-row items-center"><Text className="text-white font-bold text-[14px] mr-1">#3</Text><Text className="text-[#88b0ff] text-[9px] font-bold">OVERALL</Text></View>
                <View className="flex-row items-center"><Text className="text-white font-bold text-[14px] mr-1">99%</Text><Text className="text-[#88b0ff] text-[9px] font-bold">ROSTERED</Text></View>
                <View className="flex-row items-center"><Text className="text-white font-bold text-[14px] mr-1">99%</Text><Text className="text-[#88b0ff] text-[9px] font-bold">STARTED</Text></View>
              </View>
            </View>

            {/* Dark Body Section */}
            <View className="p-4 flex-row">
              {/* Game Logs Area (Left) */}
              <View className="flex-[1.5] mr-4 border-r border-[#333] pr-4">
                <Text className="text-[#88b0ff] text-[11px] font-bold mb-3 tracking-wider">GAME LOGS</Text>
                
                {/* Year Tabs */}
                <View className="flex-row mb-3 justify-between pr-2">
                  <View className="bg-[#00e5ff] rounded-full px-2 py-0.5"><Text className="text-black text-[9px] font-bold">2023</Text></View>
                  <Text className="text-gray-400 text-[9px] font-bold mt-0.5">2024</Text>
                  <Text className="text-gray-400 text-[9px] font-bold mt-0.5">2022</Text>
                  <Text className="text-gray-400 text-[9px] font-bold mt-0.5">MORE</Text>
                </View>

                {/* Table Header */}
                <View className="flex-row justify-between border-b border-[#333] pb-1.5 mb-2">
                  <Text className="text-gray-500 text-[8px] w-5">WK</Text>
                  <Text className="text-gray-500 text-[8px] w-6">OPP</Text>
                  <Text className="text-gray-500 text-[8px] w-8">FPTS</Text>
                  <Text className="text-gray-500 text-[8px] flex-1 text-center">PASSING</Text>
                  <Text className="text-gray-500 text-[8px] flex-1 text-center">RUSHING</Text>
                </View>

                {/* Table Row 1 */}
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-white text-[9px] w-5">1</Text>
                  <Text className="text-white text-[9px] w-6">NYJ</Text>
                  <Text className="text-white text-[9px] w-8 font-bold">18.04</Text>
                  <Text className="text-gray-400 text-[9px] flex-1 text-center">236</Text>
                  <Text className="text-gray-400 text-[9px] flex-1 text-center">36</Text>
                </View>
                {/* Table Row 2 */}
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-white text-[9px] w-5">2</Text>
                  <Text className="text-white text-[9px] w-6">LV</Text>
                  <Text className="text-white text-[9px] w-8 font-bold">24.50</Text>
                  <Text className="text-gray-400 text-[9px] flex-1 text-center">274</Text>
                  <Text className="text-gray-400 text-[9px] flex-1 text-center">7</Text>
                </View>
                {/* Table Row 3 */}
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-white text-[9px] w-5">3</Text>
                  <Text className="text-white text-[9px] w-6">WAS</Text>
                  <Text className="text-white text-[9px] w-8 font-bold">28.12</Text>
                  <Text className="text-gray-400 text-[9px] flex-1 text-center">218</Text>
                  <Text className="text-gray-400 text-[9px] flex-1 text-center">46</Text>
                </View>

                <TouchableOpacity className="mt-2 border-t border-[#333] pt-2">
                  <Text className="text-[#88b0ff] text-[10px] text-center font-medium">View Full Stats</Text>
                </TouchableOpacity>
              </View>

              {/* Latest News Area (Right) */}
              <View className="flex-1">
                <Text className="text-white text-[11px] font-bold mb-3 tracking-wider">LATEST NEWS</Text>
                <Text className="text-white text-[10px] font-bold mb-1 leading-4">Josh Allen Still the 1.01 in Superflex Startups?</Text>
                <Text className="text-gray-500 text-[7px] mb-2">16 days ago via RotoBaller</Text>
                <Text className="text-gray-400 text-[8px] leading-3" numberOfLines={12}>
                  Buffalo Bills quarterback Josh Allen has finished the past six seasons as the QB1, the QB2, the QB1, the QB1, the QB1, and the QB1, and even as he enters his age-28 season, he has a strong case as anyone to top the superflex dynasty rankings. At an age when most rushing quarterbacks face a durability-related decline, Allen has been able to sidestep such concerns with his 6'5", 237-pound frame. With the Bills trading for veteran receiver Stefon Diggs, many assume the offense will rely heavily on Allen's rushing ability this season.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
