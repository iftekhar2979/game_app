import React from 'react';
import { View, Text, Image, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useGetLeaguesQuery } from '../../store/api/leagueApi';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Fallback mock data if API returns empty
const MOCK_LEAGUES = [
  { id: 'mock-1', name: '2026 Final cheer', membersCount: 10, status: 'Draft' },
  { id: 'mock-2', name: '2026 Final cheer', membersCount: 12, status: 'Draft' },
  { id: 'mock-3', name: '2026 Final cheer', membersCount: 8, status: 'Play' },
  { id: 'mock-4', name: '2026 Final cheer', membersCount: 14, status: 'Play' },
  { id: 'mock-5', name: '2026 Final cheer', membersCount: 20, status: 'Play' },
];

export default function FantasyLeagueScreen() {
  const navigation = useNavigation<NavigationProp>();
  const createdLeagues = useSelector((state: RootState) => state.league.leagues);
  const { data: apiLeagues, isLoading, refetch, isFetching } = useGetLeaguesQuery();

  const formattedApiLeagues = (apiLeagues || []).map((league: any) => ({
    id: league._id || league.id,
    name: league.name || 'Fantasy League',
    membersCount: league.joinedTeamCount ?? league.membersCount ?? 1,
    status:
      league.status === 'registration_open' ||
      league.status === 'drafting' ||
      league.status === 'DRAFT' ||
      league.status === 'Draft'
        ? 'Draft'
        : 'Play',
    logoUri: league.logoUri || league.logoUrl,
    visibility: league.visibility || 'public',
    createdAt: league.createdAt ? new Date(league.createdAt).getTime() : 0,
  }));

  // Combine backend leagues, local state leagues, and mock fallback
  const allLeagues =
    formattedApiLeagues.length > 0
      ? formattedApiLeagues
      : [
          ...createdLeagues.map((league) => ({
            ...league,
            status: 'Draft',
          })),
          ...MOCK_LEAGUES,
        ];

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      className="flex-row items-center justify-between bg-[#0a0a0a] border border-[#333] rounded-2xl p-4 mb-3"
      activeOpacity={0.8}
      onPress={() => navigation.navigate('LeagueDetail', { leagueId: item.id })}
    >
      <View className="flex-row items-center">
        <Image 
          source={{ uri: item.logoUri || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=150&auto=format&fit=crop' }} 
          className="w-10 h-10 rounded-full bg-white mr-[14px]" 
        />
        <View className="justify-center">
          <Text className="text-white text-base font-normal mb-1">{item.name}</Text>
          <Text className="text-[#E0B566] text-xs">{`${item.membersCount} Members`}</Text>
        </View>
      </View>
      
      {item.status === 'Draft' ? (
        <Text className="text-[#E0B566] text-sm font-medium">{item.status}</Text>
      ) : (
        <View className="border border-[#E0B566] rounded-full py-1.5 px-4">
          <Text className="text-[#E0B566] text-sm font-medium">{item.status}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2.5 pb-6">
        <TouchableOpacity 
          className="w-11 h-11 rounded-xl border border-[#333] justify-center items-center mr-4"
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-[22px] font-semibold">Fantasy League</Text>
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#E0B566" />
          <Text className="text-gray-400 text-xs mt-3">Loading Fantasy Leagues...</Text>
        </View>
      ) : (
        <FlatList
          data={allLeagues}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshing={isFetching}
          onRefresh={refetch}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity 
        className="absolute bottom-[30px] right-5 w-14 h-14 rounded-2xl border border-[#444] bg-[#0a0a0a] justify-center items-center" 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CreateLeague')}
      >
        <Plus color="#fff" size={24} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

