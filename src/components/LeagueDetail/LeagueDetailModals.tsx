import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

export const LeagueSettingsModal = ({ isVisible, onClose }: any) => {
  const SETTINGS_OPTIONS = [
    { id: '1', title: 'League settings' },
    { id: '2', title: 'Team settings' },
    { id: '3', title: 'Roster settings' },
    { id: '4', title: 'Scoring settings' },
    { id: '5', title: 'Draft settings' },
    { id: '6', title: 'Member settings' },
    { id: '7', title: 'Commissioner control' },
    { id: '8', title: 'Delete league', isDanger: true },
  ];

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        className="flex-1 bg-black/50 justify-center items-center px-6" 
        onPress={onClose}
      >
        <Pressable className="w-full bg-[#1e1e1e] rounded-[16px] border border-[#333] overflow-hidden">
          {SETTINGS_OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              className={`p-4 ${index !== SETTINGS_OPTIONS.length - 1 ? 'border-b border-[#333]' : ''}`}
              activeOpacity={0.7}
              onPress={onClose}
            >
              <Text className={`${option.isDanger ? 'text-[#ff4444]' : 'text-white'} text-[16px]`}>
                {option.title}
              </Text>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export const AddTeamModal = ({ isVisible, onClose, teamMembers, onAddTeam }: any) => {
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 bg-black/80 justify-end"
        activeOpacity={1}
        onPress={onClose}
      >
        <View className="bg-[#1a1a1a] rounded-t-[32px] p-6 border-t border-[#333] h-[60%] w-full">
          <Text className="text-white text-[18px] font-medium mb-6 text-center">Add Team to slot</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {teamMembers.map((team: any) => (
              <TouchableOpacity
                key={team.id}
                className="flex-row items-center border-b border-[#333] pb-4 mb-4"
                onPress={() => onAddTeam(team)}
              >
                <View className="w-12 h-12 rounded-full border border-[#333] justify-center items-center bg-black mr-4">
                  <Text className="text-[#8B3DFF] text-[10px] font-bold">CHEER</Text>
                </View>
                <View>
                  <Text className="text-white text-[15px] mb-1">{team.name}</Text>
                  <Text className="text-[#E0B566] text-[13px]">{team.handle}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export const PlayerDetailModal = ({ isVisible, onClose, selectedPlayer }: any) => {
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 justify-center items-center px-3">
        <View className="w-full bg-[#1e1e1e] rounded-[16px] overflow-hidden border border-[#333]">
          {/* Blue Header Section */}
          <View className="bg-[#0b3887] px-4 pt-4 pb-3 relative">
            <View className="flex-row justify-between items-start mb-2">
              <TouchableOpacity onPress={onClose} className="p-1 -ml-1">
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
  );
};
