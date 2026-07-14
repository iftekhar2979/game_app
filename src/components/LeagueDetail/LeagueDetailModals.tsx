import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, Pressable } from 'react-native';
import { ChevronLeft, ChevronDown, Upload, User, Users, Plus, Minus, Unlock } from 'lucide-react-native';

export const LeagueSettingsModal = ({ isVisible, onClose, onOptionSelect }: any) => {
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
              onPress={() => {
                onClose();
                if (onOptionSelect) onOptionSelect(option.title);
              }}
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

export const LeagueSettingsSubModal = ({ isVisible, onClose }: any) => {
  return (
    <Modal visible={isVisible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black pt-12 px-5">
        <View className="flex-row items-center mb-10">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 border border-[#333] rounded-xl justify-center items-center mr-4">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-[20px] font-medium">League settings</Text>
        </View>

        <TouchableOpacity className="border border-[#8B3DFF] rounded-[16px] py-10 mb-6 items-center justify-center">
           <View className="w-10 h-10 border border-gray-400 rounded-full items-center justify-center mb-3">
             <Upload color="#ccc" size={18} />
           </View>
           <Text className="text-gray-300 text-[14px]">Upload league logo</Text>
        </TouchableOpacity>

        <View className="border border-[#8B3DFF] rounded-[16px] flex-row items-center px-4 h-[56px] mb-4">
          <User color="#ccc" size={18} className="mr-3" />
          <Text className="text-gray-400 text-[14px]">League name</Text>
        </View>

        <View className="border border-[#8B3DFF] rounded-[16px] flex-row items-center justify-between px-4 h-[56px] mb-8">
          <View className="flex-row items-center">
            <Users color="#ccc" size={18} className="mr-3" />
            <Text className="text-gray-400 text-[14px]">Member of teams</Text>
          </View>
          <ChevronDown color="#ccc" size={20} />
        </View>
        
        <View className="flex-1 justify-end pb-8">
          <TouchableOpacity className="bg-[#8B3DFF] rounded-full h-[56px] justify-center items-center" onPress={onClose}>
            <Text className="text-white text-[16px] font-medium">Save changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const RosterSettingsSubModal = ({ isVisible, onClose }: any) => {
  const ROSTER_POSITIONS = [
    'QUARTERBACK (QB)',
    'RUNNINGBACK (RB)',
    'WIDERECEIVER (WD)',
    'TIGHTEND (TE)',
    'FLEX (W/R/T)',
    'FLEX (W/R/T)',
    'KICKER (K)',
    'DEFENSE (DEF)',
    'DL',
    'LB'
  ];

  return (
    <Modal visible={isVisible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black pt-12 px-5">
        <View className="flex-row items-center mb-8">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 border border-[#333] rounded-xl justify-center items-center mr-4">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-[20px] font-medium">Roster settings</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {ROSTER_POSITIONS.map((pos, index) => (
            <View key={index} className="flex-row items-center mb-4">
              <View className="flex-row items-center bg-[#333] rounded-full px-2 py-1.5 mr-4 w-[110px] justify-between">
                <TouchableOpacity className="bg-[#e0e0e0] w-6 h-6 rounded-full items-center justify-center">
                  <Minus color="#000" size={16} />
                </TouchableOpacity>
                <Text className="text-white mx-2 font-medium">1</Text>
                <TouchableOpacity className="bg-[#e0e0e0] w-6 h-6 rounded-full items-center justify-center">
                  <Plus color="#000" size={16} />
                </TouchableOpacity>
              </View>
              <View className="w-9 h-9 rounded-full bg-[#444] mr-4" />
              <Text className="text-white text-[13px]">{pos}</Text>
            </View>
          ))}
        </ScrollView>

        <View className="py-8 bg-black">
          <TouchableOpacity className="bg-[#8B3DFF] rounded-full h-[56px] justify-center items-center" onPress={onClose}>
            <Text className="text-white text-[16px] font-medium">Save changes</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const MemberSettingsSubModal = ({ isVisible, onClose }: any) => {
  const MEMBERS = [
    { id: '1', name: 'Diana', avatarUri: 'https://i.pravatar.cc/150?img=5' },
    { id: '2', name: 'Isabella', avatarUri: 'https://i.pravatar.cc/150?img=9' },
    { id: '3', name: 'Loris', avatarUri: 'https://i.pravatar.cc/150?img=12' },
    { id: '4', name: 'Savis', avatarUri: 'https://i.pravatar.cc/150?img=16' },
  ];

  return (
    <Modal visible={isVisible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black pt-12 px-5">
        <View className="flex-row items-center mb-8">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 border border-[#333] rounded-xl justify-center items-center mr-4">
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-[22px] font-medium">Member settings</Text>
        </View>

        <Text className="text-white text-[18px] font-medium mb-4">Member</Text>

        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {MEMBERS.map((member, index) => (
            <View 
              key={member.id} 
              className={`flex-row items-center justify-between py-4 ${index !== MEMBERS.length - 1 ? 'border-b border-[#333]' : 'border-b border-[#333]'}`}
            >
              <View className="flex-row items-center">
                <Image source={{ uri: member.avatarUri }} className="w-11 h-11 rounded-full mr-3" />
                <Text className="text-white text-[15px]">{member.name}</Text>
              </View>
              <TouchableOpacity>
                <Text className="text-[#E0B566] text-[13px] font-medium">Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
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

export const GiveCommissionerAccessModal = ({ isVisible, onClose }: any) => {
  const MEMBERS = [
    { id: '1', name: 'Diana', avatarUri: 'https://i.pravatar.cc/150?img=5' },
    { id: '2', name: 'Isabella', avatarUri: 'https://i.pravatar.cc/150?img=9' },
    { id: '3', name: 'Loris', avatarUri: 'https://i.pravatar.cc/150?img=12' },
    { id: '4', name: 'Savis', avatarUri: 'https://i.pravatar.cc/150?img=16' },
  ];

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity 
        className="flex-1 bg-black/50 justify-center items-center px-6" 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} className="w-full bg-[#1e1e1e] rounded-[32px] border-[3px] border-white p-6 pb-8">
          <Text className="text-white text-[20px] font-medium text-center mb-6 leading-7">Give commissioner{"\n"}access</Text>
          <View>
            {MEMBERS.map((member, index) => (
              <View 
                key={member.id} 
                className={`flex-row items-center justify-between py-4 ${index !== MEMBERS.length - 1 ? 'border-b border-[#333]' : ''}`}
              >
                <View className="flex-row items-center">
                  <Image source={{ uri: member.avatarUri }} className="w-11 h-11 rounded-full mr-4" />
                  <Text className="text-white text-[15px]">{member.name}</Text>
                </View>
                <TouchableOpacity>
                  <Text className="text-[#E0B566] text-[13px] font-medium">Give access</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export const LockRosterModal = ({ isVisible, onClose }: any) => {
  const MEMBERS = [
    { id: '1', name: 'Diana', avatarUri: 'https://i.pravatar.cc/150?img=5' },
    { id: '2', name: 'Isabella', avatarUri: 'https://i.pravatar.cc/150?img=9' },
    { id: '3', name: 'Loris', avatarUri: 'https://i.pravatar.cc/150?img=12' },
    { id: '4', name: 'Savis', avatarUri: 'https://i.pravatar.cc/150?img=16' },
  ];

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity 
        className="flex-1 bg-black/50 justify-center items-center px-6" 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} className="w-full bg-[#1e1e1e] rounded-[32px] border-[3px] border-white p-6 pb-6">
          <Text className="text-white text-[20px] font-medium text-center mb-6">Lock roster</Text>
          <View>
            {MEMBERS.map((member, index) => (
              <View 
                key={member.id} 
                className={`flex-row items-center justify-between py-4 ${index !== MEMBERS.length - 1 ? 'border-b border-[#333]' : 'border-b border-[#333]'}`}
              >
                <View className="flex-row items-center">
                  <Image source={{ uri: member.avatarUri }} className="w-11 h-11 rounded-full mr-4" />
                  <Text className="text-white text-[15px]">{member.name}</Text>
                </View>
                <TouchableOpacity>
                  <Unlock color="#fff" size={20} strokeWidth={1.5} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <TouchableOpacity 
            className="bg-[#8B3DFF] rounded-full h-[52px] justify-center items-center mt-8 mx-2" 
            onPress={onClose}
          >
            <Text className="text-white text-[15px] font-medium">Save changes</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export const DeleteLeagueModal = ({ isVisible, onClose, onDelete }: any) => {
  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity 
        className="flex-1 bg-black/60 justify-center items-center px-8" 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} className="w-full bg-[#2a2a2a] rounded-[24px] border border-white/20 p-6 py-8 items-center">
          <Text className="text-white text-[16px] font-medium mb-3">Delete league</Text>
          <Text className="text-gray-300 text-[12px] text-center mb-6 leading-5 px-2">
            Are you want to sure delete league now. If you delete now your all league data will be deleted
          </Text>
          
          <View className="flex-row justify-center w-full gap-4 px-2">
            <TouchableOpacity 
              className="flex-1 h-[40px] rounded-full border border-white/40 justify-center items-center" 
              onPress={onClose}
            >
              <Text className="text-white text-[13px]">Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-1 h-[40px] rounded-full bg-[#d33b3b] justify-center items-center" 
              onPress={onDelete}
            >
              <Text className="text-white text-[13px] font-medium">Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
