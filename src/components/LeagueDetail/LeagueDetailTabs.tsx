import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';

export const DraftTab = ({ isDraftStarted, timeLeft, league, navigation }: any) => {
  return (
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
          <Text className="text-[#E0B566] text-[13px] mr-16" numberOfLines={1}>
            https://cheerbattle.com/leagues/join/{league.id}
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
            source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`https://cheerbattle.com/leagues/join/${league.id}`)}` }}
            className="w-[180px] h-[180px]"
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
};

export const TeamTab = ({ teamSlots, setSelectedSlotIndex, setIsAddTeamModalVisible }: any) => {
  return (
    <View className="mb-4 mt-2">
      {teamSlots.map((team: any, index: number) => {
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

export const LeagueTab = ({ leagueStandings }: any) => {
  return (
    <View className="mb-4 mt-2">
      {leagueStandings.map((team: any) => (
        <View key={team.id} className="flex-row items-center justify-between border-b border-[#222] pb-4 mb-4">
          <View className="flex-row items-center">
            <View className="w-12 h-12 rounded-full border border-[#333] justify-center items-center bg-black mr-4">
              <Text className="text-[#8B3DFF] text-[10px] font-bold">CHEER</Text>
            </View>
            <View>
              <Text className="text-white text-[15px] mb-1">{team.name}</Text>
              <Text className="text-[#FFB84D] text-[13px]">{team.handle}</Text>
            </View>
          </View>
          
          <View className="items-end justify-center w-[60px]">
            <Text className="text-[#FFB84D] text-[14px] font-medium mb-1.5">{team.points}</Text>
            <View className="w-full h-1 bg-[#333] rounded-full overflow-hidden">
              <View className="h-full bg-[#FFB84D]" style={{ width: `${team.progress}%` }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};
