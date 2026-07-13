import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DraftRoom'>;

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
  const navigation = useNavigation<NavigationProp>();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'empty' | 'filled'>('filled');
  const [setPlayerModalVisible, setSetPlayerModalVisible] = useState(false);

  // Generate 6x4 grid (6 rows, 4 columns)
  const gridRows = [1, 2, 3, 4, 5, 6];
  const gridCols = [1, 2, 3, 4];

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2.5 pb-4">
        <TouchableOpacity 
          className="w-11 h-11 rounded-xl border border-[#333] justify-center items-center mr-4"
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-[22px] font-semibold">Waiting to start</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Top Users */}
        <View className="flex-row justify-between px-5 mb-4">
          {MOCK_USERS.map((user) => (
            <View key={user.id} className="items-center flex-1">
              <Image source={{ uri: user.avatarUri }} className="w-8 h-8 rounded-full bg-white mb-2" />
              <Text className="text-gray-300 text-[12px]">{user.name}</Text>
            </View>
          ))}
        </View>

        {/* Draft Grid */}
        <View className="px-5 mb-4">
          {gridRows.map((row) => (
            <View key={`row-${row}`} className="flex-row justify-between mb-2">
              {gridCols.map((col) => (
                <TouchableOpacity 
                  key={`cell-${row}-${col}`} 
                  className="flex-1 h-16 border border-[#333] rounded-xl bg-[#0a0a0a] justify-end items-end p-2 mx-1"
                  activeOpacity={0.7}
                  onPress={() => {
                    setModalMode(row === 1 ? 'filled' : 'empty');
                    setModalVisible(true);
                  }}
                >
                  <Text className="text-[#666] text-[10px]">{row}.{col}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Progress Bar */}
        <View className="px-5 mb-8">
          <View className="h-1 bg-[#333] rounded-full w-full">
            <View className="h-1 bg-[#ccc] rounded-full w-1/3" />
          </View>
        </View>

        {/* Players Section */}
        <View className="px-5 pb-10">
          <Text className="text-white text-[18px] font-medium mb-4">Players</Text>
          
          {/* Player Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            <TouchableOpacity className="border border-[#E0B566] rounded-full px-4 py-1.5 mr-3">
              <Text className="text-[#E0B566] text-[13px] font-medium">New</Text>
            </TouchableOpacity>
            {['All', 'Add here', 'Add here', 'Add here', 'Add here'].map((tab, idx) => (
              <TouchableOpacity key={idx} className="px-4 py-1.5 mr-1">
                <Text className="text-gray-400 text-[13px] font-medium">{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Player List */}
          {MOCK_PLAYERS.map((player) => (
            <View key={player.id} className="flex-row items-center justify-between border-b border-[#222] pb-4 mb-4">
              <View className="flex-row items-center">
                <Image source={{ uri: player.avatarUri }} className="w-11 h-11 rounded-full bg-white mr-4" />
                <View>
                  <Text className="text-[#ccc] text-[15px] mb-1">{player.name}</Text>
                  <Text className="text-[#E0B566] text-[12px]">Rostered  {player.rostered}</Text>
                </View>
              </View>
              <View className="items-center">
                <Text className="text-[#E0B566] text-[16px] font-medium mb-1">{player.points}</Text>
                <View className="w-10 h-[2px] bg-[#E0B566]" />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Draft Setting Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
      >
        <View className="flex-1 justify-center items-center bg-black/80 px-5">
          <View className="w-full bg-[#1e1e1e] border border-[#333] rounded-[32px] p-6 items-center">
            <Text className="text-white text-[18px] font-medium mb-8 mt-2">Draft setting</Text>
            
            {modalMode === 'empty' ? (
              <TouchableOpacity 
                className="w-full border border-gray-400 rounded-full h-[52px] justify-center items-center mb-4"
                activeOpacity={0.8}
                onPress={() => {
                  setModalVisible(false);
                  setSetPlayerModalVisible(true);
                }}
              >
                <Text className="text-gray-300 text-[15px]">Set player</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity 
                  className="w-full border border-gray-400 rounded-full h-[52px] justify-center items-center mb-4"
                  activeOpacity={0.8}
                  onPress={() => {
                    setModalVisible(false);
                    setSetPlayerModalVisible(true);
                  }}
                >
                  <Text className="text-gray-300 text-[15px]">Change player</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  className="w-full border border-gray-400 rounded-full h-[52px] justify-center items-center mb-4"
                  activeOpacity={0.8}
                  onPress={() => setModalVisible(false)}
                >
                  <Text className="text-gray-300 text-[15px]">Remove player</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity 
              className="w-full border border-gray-400 rounded-full h-[52px] justify-center items-center mb-2"
              activeOpacity={0.8}
              onPress={() => setModalVisible(false)}
            >
              <Text className="text-gray-300 text-[15px]">Auto set player</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Set Player Modal */}
      <Modal
        visible={setPlayerModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View className="flex-1 justify-center items-center bg-black/80 px-4">
          <View className="w-full h-[75%] bg-[#3a3a3a] border border-[#555] rounded-[32px] p-6">
            
            {/* Modal Header */}
            <View className="items-center mb-6 relative">
              <Text className="text-white text-[20px] font-semibold">Set player</Text>
              <TouchableOpacity 
                className="absolute right-0"
                onPress={() => setSetPlayerModalVisible(false)}
              >
                <Text className="text-gray-400 text-sm">Close</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-white text-[18px] font-medium mb-4">Players</Text>
            
            {/* Player Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 flex-grow-0 min-h-[30px]">
              <TouchableOpacity className="border border-[#E0B566] rounded-full px-4 py-1 mr-3 h-[30px] justify-center">
                <Text className="text-[#E0B566] text-[13px] font-medium">New</Text>
              </TouchableOpacity>
              {['All', 'Add here', 'Add here', 'Add here'].map((tab, idx) => (
                <TouchableOpacity key={idx} className="px-4 py-1 mr-1 h-[30px] justify-center">
                  <Text className="text-gray-400 text-[13px] font-medium">{tab}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Player List */}
            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              {MOCK_PLAYERS.map((player) => (
                <View key={player.id} className="flex-row items-center justify-between border-b border-[#555] pb-4 mb-4">
                  <View className="flex-row items-center">
                    <Image source={{ uri: player.avatarUri }} className="w-12 h-12 rounded-full bg-white mr-4" />
                    <View>
                      <Text className="text-white text-[15px] mb-1">{player.name}</Text>
                      <Text className="text-[#E0B566] text-[12px]">Rostered  {player.rostered}</Text>
                    </View>
                  </View>
                  <View className="items-center">
                    <Text className="text-[#E0B566] text-[16px] font-medium mb-1">{player.points}</Text>
                    <View className="w-10 h-[2px] bg-[#E0B566]" />
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
