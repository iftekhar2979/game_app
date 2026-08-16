import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Repeat, Plus, Users, UserCheck } from 'lucide-react-native';


export const MatchupTab = ({ matchup, starters }: any) => {
  const [isWeekModalVisible, setIsWeekModalVisible] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState('Week 1');
  const weeks = Array.from({ length: 18 }, (_, i) => `Week ${i + 1}`);

  return (
    <View className="mb-4 mt-2">
      {/* Matchups Header */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-white text-[18px] font-semibold">Matchups</Text>
        <TouchableOpacity 
          className="flex-row items-center p-2"
          onPress={() => setIsWeekModalVisible(true)}
        >
          <Text className="text-gray-400 text-[12px] mr-2">{selectedWeek}</Text>
          <Repeat color="#999" size={14} />
        </TouchableOpacity>
      </View>

      {/* Matchup Card */}
      <View className="border border-[#E0B566] rounded-[24px] mb-8 p-1 relative overflow-hidden">
        <View className="flex-row">
          {/* Left Team */}
          <View className="flex-1 border border-[#333] rounded-[20px] bg-[#0a0a0a] p-4 mr-0.5">
            <View className="w-10 h-10 rounded-full border border-[#333] justify-center items-center bg-black mb-3">
              <Text className="text-[#8B3DFF] text-[8px] font-bold">CHEER</Text>
            </View>
            <Text className="text-[#E0B566] text-[12px] mb-1">{matchup.team1.handle}</Text>
            <Text className="text-white text-[14px] mb-3">{matchup.team1.name}</Text>
            
            <View className="w-full h-1 bg-[#333] rounded-full overflow-hidden mb-2">
              <View className="h-full bg-[#8B3DFF]" style={{ width: '50%' }} />
            </View>
            
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-400 text-[10px]">{matchup.team1.percentage}</Text>
              <Text className="text-white text-[12px] font-medium">{matchup.team1.score}</Text>
            </View>
          </View>

          {/* Right Team */}
          <View className="flex-1 border border-[#333] rounded-[20px] bg-[#0a0a0a] p-4 ml-0.5">
            <View className="w-10 h-10 rounded-full border border-[#333] justify-center items-center bg-black mb-3">
              <Text className="text-[#8B3DFF] text-[8px] font-bold">CHEER</Text>
            </View>
            <Text className="text-[#E0B566] text-[12px] mb-1">{matchup.team2.handle}</Text>
            <Text className="text-white text-[14px] mb-3">{matchup.team2.name}</Text>
            
            <View className="w-full h-1 bg-[#333] rounded-full overflow-hidden mb-2">
              <View className="h-full bg-[#8B3DFF]" style={{ width: '50%' }} />
            </View>
            
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-400 text-[10px]">{matchup.team2.percentage}</Text>
              <Text className="text-white text-[12px] font-medium">{matchup.team2.score}</Text>
            </View>
          </View>
        </View>

        {/* VS Badge */}
        <View className="absolute top-[42%] left-1/2 w-8 h-8 bg-white rounded-full justify-center items-center -ml-4 z-10 shadow-sm">
          <Text className="text-black text-[12px] font-semibold">VS</Text>
        </View>
      </View>

      {/* Starters Section */}
      <Text className="text-white text-[18px] font-semibold mb-4">Starters</Text>
      <View className="flex-row flex-wrap justify-between">
        {starters?.map((starter: any) => (
          <View key={starter.id} className="w-[48%] flex-row items-center border-b border-[#222] pb-3 mb-3">
            <Image source={{ uri: starter.avatarUri }} className="w-10 h-10 rounded-full bg-[#333] mr-3" />
            <View className="flex-1">
              <View className="flex-row justify-between items-center mb-0.5">
                <Text className="text-white text-[14px]" numberOfLines={1}>{starter.name}</Text>
                <Text className="text-[#E0B566] text-[10px] font-medium">{starter.points}</Text>
              </View>
              <Text className="text-[#E0B566] text-[10px]">{starter.time}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Week Selection Modal */}
      <Modal
        visible={isWeekModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsWeekModalVisible(false)}
      >
        <TouchableOpacity 
          className="flex-1 justify-center items-center bg-black/80 px-6"
          activeOpacity={1}
          onPress={() => setIsWeekModalVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            className="w-full bg-[#1e1e1e] rounded-[32px] border-2 border-white p-6 pt-8 items-center shadow-lg shadow-black"
          >
            <View className="flex-row flex-wrap justify-between w-full">
              {weeks.map((week, index) => (
                <TouchableOpacity
                  key={index}
                  className={`w-[31%] border ${selectedWeek === week ? 'border-[#FFB84D]' : 'border-gray-400'} rounded-[12px] py-2 mb-4 justify-center items-center`}
                  onPress={() => {
                    setSelectedWeek(week);
                    setIsWeekModalVisible(false);
                  }}
                >
                  <Text className={`${selectedWeek === week ? 'text-[#FFB84D]' : 'text-white'} text-[13px]`}>{week}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export const DraftTab = ({ isDraftStarted, timeLeft, league, navigation }: any) => {
  const joinUrl = `https://cheerbattle.com/leagues/join/${league?.code || league?.id || ''}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(joinUrl)}`;

  const draftTimeFormatted = (() => {
    const rawDate =
      league?.draftStartsAt ||
      league?.settings?.draftSettings?.draftStartsAt ||
      league?.draftDate;

    if (!rawDate) return 'Draft time to be scheduled';
    try {
      const d = new Date(rawDate);
      return `${d.toDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return 'Draft scheduled';
    }
  })();

  return (
    <View>
      {/* Draftboard Card */}
      {!isDraftStarted ? (
        <View className="bg-[#FFB84D] rounded-[24px] p-5 mb-8">
          <Text className="text-black text-center text-[16px] font-medium mb-1">Draftboard</Text>
          <Text className="text-black text-center text-[12px] opacity-80 mb-6">
            {draftTimeFormatted}
          </Text>

          {/* Countdown */}
          {timeLeft ? (
            <View className="flex-row justify-center items-center mb-6">
              <View className="items-center mx-1 flex-row">
                <Text className="text-black text-[20px] font-bold mr-1">{String(timeLeft.days).padStart(2, '0')}</Text>
                <Text className="text-black text-[10px] mt-1 mr-2 opacity-80">Day</Text>
                <Text className="text-black text-[18px] font-bold mr-2">:</Text>
              </View>
              <View className="items-center mx-1 flex-row">
                <Text className="text-black text-[20px] font-bold mr-1">{String(timeLeft.hours).padStart(2, '0')}</Text>
                <Text className="text-black text-[10px] mt-1 mr-2 opacity-80">Hours</Text>
                <Text className="text-black text-[18px] font-bold mr-2">:</Text>
              </View>
              <View className="items-center mx-1 flex-row">
                <Text className="text-black text-[20px] font-bold mr-1">{String(timeLeft.minutes).padStart(2, '0')}</Text>
                <Text className="text-black text-[10px] mt-1 mr-2 opacity-80">Min</Text>
                <Text className="text-black text-[18px] font-bold mr-2">:</Text>
              </View>
              <View className="items-center mx-1 flex-row">
                <Text className="text-black text-[20px] font-bold mr-1">{String(timeLeft.seconds).padStart(2, '0')}</Text>
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
            onPress={() => navigation.navigate('DraftRoom', { leagueId: league?.id })}
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
            onPress={() => navigation.navigate('DraftRoom', { leagueId: league?.id })}
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
          <Text className="text-[#E0B566] text-[13px] mr-16" numberOfLines={1}>
            {joinUrl}
          </Text>
          <TouchableOpacity className="absolute right-2 border border-[#8B3DFF] rounded-[12px] px-4 py-2">
            <Text className="text-[#8B3DFF] text-[13px] font-medium">Copy</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* QR Code Section */}
      <View className="mb-10 items-center">
        <Text className="text-white text-[18px] font-medium mb-6">Scan QR code to join</Text>
        <View className="bg-white p-4 rounded-[24px]">
          {/* Dynamic QR Code Image */}
          <Image
            source={{ uri: qrCodeUrl }}
            className="w-[180px] h-[180px]"
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
};

export const TeamTab = ({
  teamSlots = [],
  setSelectedSlotIndex,
  setIsAddTeamModalVisible,
  isMember = false,
  onOpenJoinModal,
  maxTeams = 8,
}: {
  teamSlots: any[];
  setSelectedSlotIndex: (index: number) => void;
  setIsAddTeamModalVisible: (visible: boolean) => void;
  isMember?: boolean;
  onOpenJoinModal?: () => void;
  maxTeams?: number;
}) => {
  const filledCount = teamSlots.filter(t => !!t).length;

  return (
    <View className="mb-4 mt-2">
      {/* Header Summary */}
      <View className="flex-row items-center justify-between mb-4 bg-[#111] p-4 rounded-2xl border border-[#222]">
        <View className="flex-row items-center">
          <Users color="#E0B566" size={20} className="mr-3" />
          <View>
            <Text className="text-white text-[15px] font-semibold">League Teams</Text>
            <Text className="text-gray-400 text-[12px]">{`${filledCount} / ${maxTeams} Teams Filled`}</Text>
          </View>
        </View>

        {!isMember && onOpenJoinModal ? (
          <TouchableOpacity
            className="bg-[#8B3DFF] px-4 py-2 rounded-full flex-row items-center"
            activeOpacity={0.8}
            onPress={onOpenJoinModal}
          >
            <Plus color="#fff" size={16} className="mr-1" />
            <Text className="text-white text-[13px] font-bold">Join League</Text>
          </TouchableOpacity>
        ) : (
          <View className="bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-full flex-row items-center">
            <UserCheck color="#34d399" size={14} className="mr-1.5" />
            <Text className="text-emerald-400 text-[12px] font-medium">Joined</Text>
          </View>
        )}
      </View>

      {/* Banner if not joined */}
      {!isMember && onOpenJoinModal ? (
        <View className="bg-[#1a132b] border border-[#8B3DFF]/50 rounded-2xl p-4 mb-5 flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-white text-[15px] font-bold mb-1">Add Your Team to This Public League</Text>
            <Text className="text-gray-300 text-[12px]">Choose a team name and join the competition before draft day!</Text>
          </View>
          <TouchableOpacity
            className="bg-[#FFB84D] px-4 py-2.5 rounded-full"
            activeOpacity={0.9}
            onPress={onOpenJoinModal}
          >
            <Text className="text-black text-[13px] font-bold">Join Now</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Slots */}
      {teamSlots.map((team: any, index: number) => {
        if (team) {
          return (
            <View key={`slot-${index}`} className="flex-row items-center justify-between border-b border-[#222] pb-4 mb-4">
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 rounded-full border border-[#333] justify-center items-center bg-black mr-4 overflow-hidden">
                  {team.avatarUri ? (
                    <Image source={{ uri: team.avatarUri }} className="w-full h-full" />
                  ) : (
                    <Text className="text-[#8B3DFF] text-[10px] font-bold">CHEER</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-white text-[15px] font-semibold mb-0.5" numberOfLines={1}>{team.name}</Text>
                  <Text className="text-[#E0B566] text-[13px]">{team.handle || `@team${index + 1}`}</Text>
                </View>
              </View>
              
              <View className="bg-[#222] border border-[#333] px-3 py-1 rounded-full">
                <Text className="text-gray-300 text-[11px] font-medium">{index === 0 ? 'Commissioner' : 'Joined'}</Text>
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
                if (!isMember && onOpenJoinModal) {
                  onOpenJoinModal();
                } else {
                  setSelectedSlotIndex(index);
                  setIsAddTeamModalVisible(true);
                }
              }}
            >
              <View className="w-12 h-12 rounded-full border border-dashed border-gray-600 justify-center items-center bg-[#0a0a0a] mr-4">
                <Text className="text-gray-500 text-[15px] font-medium">{index + 1}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-gray-400 text-[15px] font-medium">Empty Team Slot</Text>
                <Text className="text-gray-600 text-[12px]">
                  {!isMember ? 'Tap to join with your team' : 'Tap to add team'}
                </Text>
              </View>
              <View className="border border-[#8B3DFF]/60 bg-[#8B3DFF]/10 px-3 py-1.5 rounded-full flex-row items-center">
                <Plus color="#8B3DFF" size={14} className="mr-1" />
                <Text className="text-[#8B3DFF] text-[12px] font-bold">
                  {!isMember ? 'Join' : 'Add'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }
      })}
    </View>
  );
};


export const PlayersTab = ({ playersList, setSelectedPlayer, setIsPlayerModalVisible }: any) => {
  return (
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
      {playersList.map((player: any) => (
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
  );
};

export const LeagueTab = ({ leagueStandings, matchups }: any) => {
  return (
    <View className="mb-4 mt-2">
      {/* Matchups Section */}
      <Text className="text-white text-[18px] font-semibold mb-4">Matchups</Text>
      <View className="mb-8">
        {matchups?.map((matchup: any) => (
          <View key={matchup.id} className="border border-[#E0B566] rounded-[24px] mb-4 p-1 relative overflow-hidden">
            <View className="flex-row">
              {/* Left Team */}
              <View className="flex-1 border border-[#333] rounded-[20px] bg-[#0a0a0a] p-4 mr-0.5">
                <View className="w-10 h-10 rounded-full border border-[#333] justify-center items-center bg-black mb-3">
                  <Text className="text-[#8B3DFF] text-[8px] font-bold">CHEER</Text>
                </View>
                <Text className="text-[#E0B566] text-[12px] mb-1">{matchup.team1.handle}</Text>
                <Text className="text-white text-[14px] mb-3">{matchup.team1.name}</Text>
                
                <View className="w-full h-1 bg-[#333] rounded-full overflow-hidden mb-2">
                  <View className="h-full bg-[#8B3DFF]" style={{ width: '50%' }} />
                </View>
                
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-400 text-[10px]">{matchup.team1.percentage}</Text>
                  <Text className="text-white text-[12px] font-medium">{matchup.team1.score}</Text>
                </View>
              </View>

              {/* Right Team */}
              <View className="flex-1 border border-[#333] rounded-[20px] bg-[#0a0a0a] p-4 ml-0.5">
                <View className="w-10 h-10 rounded-full border border-[#333] justify-center items-center bg-black mb-3">
                  <Text className="text-[#8B3DFF] text-[8px] font-bold">CHEER</Text>
                </View>
                <Text className="text-[#E0B566] text-[12px] mb-1">{matchup.team2.handle}</Text>
                <Text className="text-white text-[14px] mb-3">{matchup.team2.name}</Text>
                
                <View className="w-full h-1 bg-[#333] rounded-full overflow-hidden mb-2">
                  <View className="h-full bg-[#8B3DFF]" style={{ width: '50%' }} />
                </View>
                
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-400 text-[10px]">{matchup.team2.percentage}</Text>
                  <Text className="text-white text-[12px] font-medium">{matchup.team2.score}</Text>
                </View>
              </View>
            </View>

            {/* VS Badge */}
            <View className="absolute top-[42%] left-1/2 w-8 h-8 bg-white rounded-full justify-center items-center -ml-4 z-10 shadow-sm">
              <Text className="text-black text-[12px] font-semibold">VS</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Standings Section */}
      <Text className="text-white text-[18px] font-semibold mb-4">Standings</Text>
      <View>
        {leagueStandings?.map((team: any, index: number) => (
          <View key={team.id} className="flex-row items-center justify-between border-b border-[#222] pb-4 mb-4">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full border border-[#444] justify-center items-center bg-black mr-4">
                <Text className="text-white text-[14px]">{index + 1}</Text>
              </View>
              <View>
                <Text className="text-white text-[15px] mb-1">{team.name}</Text>
                <Text className="text-[#E0B566] text-[13px]">{team.handle}</Text>
              </View>
            </View>
            
            <View className="items-end justify-center">
              <Text className="text-[#E0B566] text-[15px] font-medium">{team.score}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};
