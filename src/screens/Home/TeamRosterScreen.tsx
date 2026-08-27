import React from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Shield, Trophy, User } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useGetFantasyCheerRosterQuery } from '../../store/api/cheerApi';
import { RosterSections } from '../../components/LeagueDetail/RosterPlayerRow';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TeamRoster'>;
type RouteProps = RouteProp<RootStackParamList, 'TeamRoster'>;

const StatBox = ({ label, value }: { label: string; value: string | number }) => (
  <View className="flex-1 items-center border-r border-[#222] last:border-r-0">
    <Text className="text-white text-[16px] font-bold">{value}</Text>
    <Text className="text-gray-500 text-[10px] uppercase font-bold mt-0.5">{label}</Text>
  </View>
);

export default function TeamRosterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { leagueId, teamId, teamName } = route.params;

  const { data, isLoading, isFetching, isError, error, refetch } = useGetFantasyCheerRosterQuery(
    { leagueId, fantasyTeamId: teamId },
    { skip: !leagueId || !teamId, refetchOnMountOrArgChange: true },
  );

  const team = data?.team;
  const owner = data?.owner;
  const headerTitle = team?.name || teamName || 'Team Roster';
  const record = team ? `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}` : '0-0';

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2.5 pb-4 border-b border-[#222]">
        <TouchableOpacity
          className="w-11 h-11 rounded-xl border border-[#333] justify-center items-center mr-4"
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-[20px] font-bold" numberOfLines={1}>{headerTitle}</Text>
          <Text className="text-gray-400 text-[12px]">
            {data ? `${data.rosterCount} cheer teams • ${data.starterCount} starting` : 'Fantasy cheer roster'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#8B3DFF" />
          <Text className="text-gray-400 text-[13px] mt-3">Loading cheer teams...</Text>
        </View>
      ) : isError || !data ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-white text-[15px] font-semibold mb-2">Roster unavailable</Text>
          <Text className="text-gray-400 text-[12px] text-center mb-4">
            {(error as any)?.data?.message || 'This fantasy cheer roster could not be loaded.'}
          </Text>
          <TouchableOpacity className="bg-[#8B3DFF] px-5 py-2.5 rounded-full" onPress={() => refetch()}>
            <Text className="text-white text-[13px] font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#8B3DFF" />
          }
        >
          {/* Manager profile */}
          <View className="bg-[#111] border border-[#222] rounded-[24px] p-4 mt-4">
            <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-3">Manager</Text>
            <View className="flex-row items-center">
              {owner?.avatarUrl ? (
                <Image source={{ uri: owner.avatarUrl }} className="w-14 h-14 rounded-full mr-4 bg-[#222]" />
              ) : (
                <View className="w-14 h-14 rounded-full mr-4 bg-[#222] border border-[#333] justify-center items-center">
                  <User color="#666" size={24} />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-white text-[16px] font-bold" numberOfLines={1}>
                  {owner?.fullName || 'League manager'}
                </Text>
                <View className="flex-row items-center flex-wrap mt-1">
                  {owner?.leagueRole && (
                    <View className="bg-[#222] border border-[#333] px-2.5 py-0.5 rounded-full mr-2 mb-1">
                      <Text className="text-gray-300 text-[10px] font-bold uppercase">
                        {owner.leagueRole === 'creator' ? 'Commissioner' : owner.leagueRole}
                      </Text>
                    </View>
                  )}
                  {owner?.isMe && (
                    <View className="bg-[#1e1a2b] border border-[#8B3DFF]/50 px-2.5 py-0.5 rounded-full mr-2 mb-1">
                      <Text className="text-[#8B3DFF] text-[10px] font-bold">YOU</Text>
                    </View>
                  )}
                  {!!owner?.joinedAt && (
                    <Text className="text-gray-500 text-[11px] mb-1">
                      {`Joined ${new Date(owner.joinedAt).toLocaleDateString()}`}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <Text className="text-gray-500 text-[11px] mt-3 pt-3 border-t border-[#222]">
              Each manager holds one team per league.
            </Text>
          </View>

          {/* Team summary */}
          <View className="bg-[#111] border border-[#222] rounded-[24px] p-4 my-4">
            <View className="flex-row items-center mb-4">
              <View className="w-14 h-14 rounded-full border border-[#333] bg-black justify-center items-center mr-4 overflow-hidden">
                {team?.logoUrl ? (
                  <Image source={{ uri: team.logoUrl }} className="w-full h-full" />
                ) : (
                  <Shield color="#8B3DFF" size={24} />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-white text-[17px] font-bold" numberOfLines={1}>{team?.name}</Text>
                <View className="flex-row items-center mt-1">
                  {team?.isOwnedByMe && (
                    <View className="bg-[#1e1a2b] border border-[#8B3DFF]/50 px-2.5 py-0.5 rounded-full mr-2">
                      <Text className="text-[#8B3DFF] text-[10px] font-bold">MY TEAM</Text>
                    </View>
                  )}
                  {team?.currentRank ? (
                    <View className="flex-row items-center">
                      <Trophy color="#E0B566" size={12} />
                      <Text className="text-[#E0B566] text-[11px] font-medium ml-1">{`Rank #${team.currentRank}`}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            <View className="flex-row border-t border-[#222] pt-3">
              <StatBox label="Record" value={record} />
              <StatBox label="Points" value={team?.totalPoints ?? 0} />
              <StatBox label="Roster" value={data.rosterCount} />
              <StatBox label="Budget" value={team?.draftBudgetRemaining ?? 0} />
            </View>
          </View>

          {/* Players */}
          <View className="bg-[#111] border border-[#222] rounded-[24px] p-4 mb-8">
            {data.rosterCount === 0 ? (
              <Text className="text-gray-500 text-[12px] italic">
                This manager has not acquired any cheer teams yet.
              </Text>
            ) : (
              <RosterSections starters={data.starters} bench={data.bench} />
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
