import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, TextInput } from 'react-native';
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

export default function LeagueDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { leagueId } = route.params;

  // Retrieve league data
  const createdLeagues = useSelector((state: RootState) => state.league.leagues);
  const league: any = createdLeagues.find(l => l.id === leagueId) || MOCK_LEAGUES.find(l => l.id === leagueId) || MOCK_LEAGUES[0];

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
          <TouchableOpacity className="bg-[#FFB84D] px-5 py-2 rounded-xl">
            <Text className="text-black text-[15px] font-semibold">Draft</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-3">
            <Text className="text-gray-400 text-[15px] font-medium">Team</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-3">
            <Text className="text-gray-400 text-[15px] font-medium">Players</Text>
          </TouchableOpacity>
          <TouchableOpacity className="px-3">
            <Text className="text-gray-400 text-[15px] font-medium">League</Text>
          </TouchableOpacity>
        </View>

        {/* Draftboard Card */}
        <View className="bg-[#FFB84D] rounded-[24px] p-5 mb-8">
          <Text className="text-black text-center text-[16px] font-medium mb-1">Draftboard</Text>
          <Text className="text-black text-center text-[12px] opacity-80 mb-6">Saturday June 27 7:30 PM ( GMT+6 )</Text>
          
          {/* Countdown */}
          <View className="flex-row justify-center items-center mb-6">
            <View className="items-center mx-1 flex-row">
              <Text className="text-black text-[20px] font-bold mr-1">1</Text>
              <Text className="text-black text-[10px] mt-1 mr-2 opacity-80">Day</Text>
              <Text className="text-black text-[18px] font-bold mr-2">:</Text>
            </View>
            <View className="items-center mx-1 flex-row">
              <Text className="text-black text-[20px] font-bold mr-1">6</Text>
              <Text className="text-black text-[10px] mt-1 mr-2 opacity-80">Hours</Text>
              <Text className="text-black text-[18px] font-bold mr-2">:</Text>
            </View>
            <View className="items-center mx-1 flex-row">
              <Text className="text-black text-[20px] font-bold mr-1">47</Text>
              <Text className="text-black text-[10px] mt-1 mr-2 opacity-80">Min</Text>
              <Text className="text-black text-[18px] font-bold mr-2">:</Text>
            </View>
            <View className="items-center mx-1 flex-row">
              <Text className="text-black text-[20px] font-bold mr-1">32</Text>
              <Text className="text-black text-[10px] mt-1 opacity-80">sec</Text>
            </View>
          </View>

          <TouchableOpacity 
            className="bg-[#8B3DFF] rounded-full h-[50px] justify-center items-center mx-8"
            activeOpacity={0.9}
            onPress={() => navigation.navigate('DraftRoom', { leagueId: league.id })}
          >
            <Text className="text-white text-[16px] font-medium">Draftroom</Text>
          </TouchableOpacity>
        </View>

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

        {/* Team Section */}
        <View className="mb-4">
          <Text className="text-white text-[18px] font-medium mb-4">Team</Text>
          
          {/* Team Item 1 */}
          <View className="flex-row items-center border-b border-[#222] pb-4 mb-4">
            <View className="w-12 h-12 rounded-full border border-[#333] justify-center items-center bg-black mr-4">
              <Text className="text-[#8B3DFF] text-[10px] font-bold">CHEER</Text>
            </View>
            <View>
              <Text className="text-[#ccc] text-[15px] mb-1">Team Cheerleading</Text>
              <Text className="text-[#E0B566] text-[13px]">@cheerleading</Text>
            </View>
          </View>

          {/* Team Item 2 */}
          <View className="flex-row items-center border-b border-[#222] pb-4">
            <View className="w-12 h-12 rounded-full border border-[#333] justify-center items-center bg-black mr-4">
              <Text className="text-[#8B3DFF] text-[10px] font-bold">CHEER</Text>
            </View>
            <View>
              <Text className="text-[#ccc] text-[15px] mb-1">Team Rubel</Text>
              <Text className="text-[#E0B566] text-[13px]">@rubel</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
