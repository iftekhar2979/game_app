import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, ImageBackground, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Settings, Edit2, ArrowRight, Dumbbell, Trophy, Medal, BarChart3, ChevronRight, MessageSquare, ThumbsUp, MoreVertical } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const avatars = useSelector((state: RootState) => state.avatar.savedAvatars);
  const userAvatarUri = avatars.length > 0 ? avatars[0].imageUri : 'https://i.pravatar.cc/150?img=11';

  const MOCK_TEAMS = [
    { id: '1', name: 'Manchester City', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Manchester_City_FC_badge.svg/150px-Manchester_City_FC_badge.svg.png' },
    { id: '2', name: 'Real Madrid', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/56/Real_Madrid_CF.svg/150px-Real_Madrid_CF.svg.png' },
    { id: '3', name: 'Liverpool', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/150px-Liverpool_FC.svg.png' },
    { id: '4', name: 'Barcelona', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/47/FC_Barcelona_%28crest%29.svg/150px-FC_Barcelona_%28crest%29.svg.png' },
  ];

  return (
    <View className="flex-1 bg-black">
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }} showsVerticalScrollIndicator={false}>

        {/* Banner Section */}
        <View className="relative w-full h-[200px]">
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop' }}
            className="w-full h-full rounded-b-[40px] overflow-hidden opacity-90"
          />

          {/* Header Buttons over Banner */}
          <SafeAreaView edges={['top']} className="absolute top-0 w-full flex-row justify-between px-5 pt-2">
            <TouchableOpacity
              className="w-10 h-10 rounded-[12px] border border-white/30 justify-center items-center bg-black/40"
              onPress={() => navigation.goBack()}
            >
              <ChevronLeft color="#fff" size={24} />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-10 h-10 rounded-[12px] border border-white/30 justify-center items-center bg-black/40"
            >
              <Settings color="#fff" size={20} />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Avatar over the Banner edge */}
          <View className="absolute -bottom-12 left-1/2 -ml-[50px] items-center justify-center z-10">
            <View className="w-[100px] h-[100px] rounded-full border-[4px] border-black overflow-hidden relative">
              <Image source={{ uri: userAvatarUri }} className="w-full h-full" />
            </View>
            <TouchableOpacity className="absolute bottom-1 right-1 w-7 h-7 bg-[#FFB84D] rounded-full justify-center items-center border-[2px] border-black">
              <Edit2 color="#000" size={12} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Info */}
        <View className="mt-16 items-center px-5">
          <Text className="text-white text-[20px] font-bold mb-1">David thomas097</Text>
          <Text className="text-gray-400 text-[13px] mb-4">Member since - June 2028, Texas</Text>

          <TouchableOpacity
            className="flex-row items-center border border-[#FFB84D] rounded-full px-4 py-1.5 mb-8"
            onPress={() => navigation.navigate('CoinStore')}
          >
            <Text className="text-[14px] mr-1">🪙</Text>
            <Text className="text-gray-300 text-[14px] font-medium mr-2">Coin: 0</Text>
            <ArrowRight color="#999" size={14} />
          </TouchableOpacity>
        </View>

        {/* XP Progress Section */}
        <View className="flex-row items-center px-5 mb-8">
          <View className="w-[60px] h-[70px] border border-[#00FFFF] rounded-[16px] justify-center items-center mr-4 bg-[#00FFFF]/10" style={{ transform: [{ rotate: '45deg' }] }}>
            <View style={{ transform: [{ rotate: '-45deg' }], alignItems: 'center' }}>
              <Text className="text-[#00FFFF] text-[12px] font-medium">Level</Text>
              <Text className="text-[#00FFFF] text-[18px] font-bold">28</Text>
            </View>
          </View>
          <View className="flex-1 justify-center ml-2">
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-300 text-[12px]">XP progress</Text>
              <Text className="text-gray-300 text-[12px]">6250 / 10,000 XP</Text>
            </View>
            <View className="w-full h-[6px] bg-[#333] rounded-full overflow-hidden mb-2">
              <View className="h-full bg-[#00FFFF]" style={{ width: '63%' }} />
            </View>
            <Text className="text-gray-400 text-[11px]">63 % of level 28</Text>
          </View>
        </View>

        {/* Favorites 2-Column Row */}
        <View className="flex-row justify-between px-5 mb-4">
          <View className="flex-1 border border-[#331166] rounded-[24px] p-4 mr-2 flex-row items-center bg-[#1a0533]">
            <Dumbbell color="#00FFFF" size={28} className="mr-3" />
            <View>
              <Text className="text-gray-400 text-[10px] mb-1">Favorite GYM</Text>
              <Text className="text-[#FFB84D] text-[12px] font-semibold mb-0.5">Iron Paradise</Text>
              <Text className="text-gray-400 text-[11px]">Texas</Text>
            </View>
          </View>

          <View className="flex-1 border border-[#331166] rounded-[24px] p-4 ml-2 flex-row items-center bg-[#1a0533]">
            <Trophy color="#00FFFF" size={28} className="mr-3" />
            <View>
              <Text className="text-gray-400 text-[10px] mb-1">Favorite team</Text>
              <Text className="text-[#FFB84D] text-[12px] font-semibold mb-0.5">Kansas City</Text>
              <Text className="text-gray-400 text-[11px]">Texas</Text>
            </View>
          </View>
        </View>

        {/* Stats 3-Column Row */}
        <View className="flex-row justify-between px-5 mb-8">
          <View className="flex-1 border border-[#331166] rounded-[24px] p-4 mr-1.5 items-center bg-[#1a0533]">
            <Trophy color="#00FFFF" size={24} className="mb-2" />
            <Text className="text-[#FFB84D] text-[11px] mb-1">Wins</Text>
            <Text className="text-white text-[14px] font-semibold">142</Text>
          </View>

          <View className="flex-1 border border-[#331166] rounded-[24px] p-4 mx-1.5 items-center bg-[#1a0533]">
            <Medal color="#00FFFF" size={24} className="mb-2" />
            <Text className="text-[#FFB84D] text-[11px] text-center leading-[12px] mb-1">League{'\n'}champions</Text>
            <Text className="text-white text-[14px] font-semibold">142</Text>
          </View>

          <View className="flex-1 border border-[#331166] rounded-[24px] p-4 ml-1.5 items-center bg-[#1a0533]">
            <BarChart3 color="#00FFFF" size={24} className="mb-2" />
            <Text className="text-[#FFB84D] text-[11px] mb-1">DFS record</Text>
            <Text className="text-white text-[14px] font-semibold">142</Text>
          </View>
        </View>

        {/* Favorite Teams Scroll */}
        {/* <View className="px-5 mb-8">
          <View className="flex-row items-center mb-4">
            <Text className="text-white text-[18px] font-semibold mr-2">Favorite Team</Text>
            <Edit2 color="#FFB84D" size={14} />
          </View>

          <View className="flex-row items-center">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1 pr-4">
              {MOCK_TEAMS.map((team) => (
                <View key={team.id} className="items-center mr-6">
                  <Image source={{ uri: team.logo }} className="w-[50px] h-[50px] rounded-full bg-white mb-2" resizeMode="contain" />
                  <Text className="text-white text-[10px] text-center max-w-[60px]">{team.name}</Text>
                </View>
              ))}
            </ScrollView>
            <ChevronRight color="#fff" size={20} className="ml-2 opacity-50" />
          </View>
        </View> */}

        {/* Posts Section */}
        <View className="px-5">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-[18px] font-semibold">Post</Text>
            <TouchableOpacity>
              <Text className="text-gray-400 text-[13px]">See all</Text>
            </TouchableOpacity>
          </View>

          {/* Mock Post 1 */}
          <View className="border border-[#222] rounded-[24px] p-4 mb-4 bg-[#0a0a0a]">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Image source={{ uri: MOCK_TEAMS[2].logo }} className="w-10 h-10 rounded-full bg-white mr-3" resizeMode="contain" />
                <View>
                  <Text className="text-white text-[14px] font-medium mb-1">Arsenal community</Text>
                  <View className="flex-row items-center">
                    <Text className="text-[#FFB84D] text-[11px] mr-1">Davidthomas097</Text>
                    <Text className="text-gray-500 text-[10px]">→ 1d</Text>
                  </View>
                </View>
              </View>
              <MoreVertical color="#666" size={18} />
            </View>
            <Text className="text-gray-300 text-[14px] mb-4 leading-[20px]">
              The Grizzlies lineup is TUFF
            </Text>

            <View className="flex-row justify-between items-center mt-2 border-t border-[#222] pt-4">
              <View className="flex-row items-center">
                <View className="flex-row mr-2 relative w-[45px]">
                  <View className="w-5 h-5 rounded-full bg-blue-500 justify-center items-center border border-black absolute left-0 z-30"><Text className="text-white text-[10px]">👍</Text></View>
                  <View className="w-5 h-5 rounded-full bg-red-500 justify-center items-center border border-black absolute left-3 z-20"><Text className="text-white text-[10px]">❤️</Text></View>
                  <View className="w-5 h-5 rounded-full bg-yellow-500 justify-center items-center border border-black absolute left-6 z-10"><Text className="text-white text-[10px]">😂</Text></View>
                </View>
                <Text className="text-gray-400 text-[12px]">231</Text>
              </View>

              <View className="flex-row items-center">
                <MessageSquare color="#999" size={14} className="mr-1.5" />
                <Text className="text-gray-400 text-[12px]">17</Text>
              </View>
            </View>
          </View>

          {/* Mock Post 2 */}
          <View className="border border-[#222] rounded-[24px] p-4 mb-4 bg-[#0a0a0a]">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Image source={{ uri: MOCK_TEAMS[1].logo }} className="w-10 h-10 rounded-full bg-white mr-3" resizeMode="contain" />
                <View>
                  <Text className="text-white text-[14px] font-medium mb-1">Real Madrid</Text>
                  <View className="flex-row items-center">
                    <Text className="text-[#FFB84D] text-[11px] mr-1">Davidthomas097</Text>
                    <Text className="text-gray-500 text-[10px]">→ 1d</Text>
                  </View>
                </View>
              </View>
              <MoreVertical color="#666" size={18} />
            </View>
            <Text className="text-gray-300 text-[14px] mb-4 leading-[20px]">
              The Grizzlies lineup is TUFF
            </Text>

            <View className="flex-row justify-between items-center mt-2 border-t border-[#222] pt-4">
              <View className="flex-row items-center">
                <View className="flex-row mr-2 relative w-[45px]">
                  <View className="w-5 h-5 rounded-full bg-blue-500 justify-center items-center border border-black absolute left-0 z-30"><Text className="text-white text-[10px]">👍</Text></View>
                  <View className="w-5 h-5 rounded-full bg-yellow-500 justify-center items-center border border-black absolute left-3 z-20"><Text className="text-white text-[10px]">😂</Text></View>
                  <View className="w-5 h-5 rounded-full bg-red-500 justify-center items-center border border-black absolute left-6 z-10"><Text className="text-white text-[10px]">❤️</Text></View>
                </View>
                <Text className="text-gray-400 text-[12px]">231</Text>
              </View>

              <View className="flex-row items-center">
                <MessageSquare color="#999" size={14} className="mr-1.5" />
                <Text className="text-gray-400 text-[12px]">17</Text>
              </View>
            </View>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}
