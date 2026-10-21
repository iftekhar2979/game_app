import React from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Crown, Medal } from 'lucide-react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import {
  CenteredError,
  CenteredLoading,
  SeasonScreenHeader,
  SectionCard,
  useLeagueSeasonContext,
} from '../../components/LeagueDetail/SeasonScreenParts';
import { useSeasonStandings } from '../../components/LeagueDetail/useSeasonStandings';
import {
  CHAMPIONSHIP_MATCH,
  REGULAR_SEASON_MATCHES,
} from '../../components/LeagueDetail/seasonRules';
import { formatTotalPoints } from '../../components/LeagueDetail/LeagueDetailTabs';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SeasonRecap'>;
type RouteProps = RouteProp<RootStackParamList, 'SeasonRecap'>;

const PLACE_LABEL = ['Champion', 'Runner-up', 'Third place', 'Fourth place'];
const PLACE_COLOR = ['#E0B566', '#C0C7D1', '#CD8B5A', '#8B3DFF'];

export default function SeasonRecapScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { leagueId, fantasyTeamId } = useRoute<RouteProps>().params;
  const { league } = useLeagueSeasonContext(leagueId);
  const season = useSeasonStandings(leagueId, league, fantasyTeamId);
  const { snapshot, finalists, standings, standingsQuery, championshipQuery } = season;

  const myStanding = standings.find(
    (row) => String(row.fantasyTeamId) === String(fantasyTeamId),
  );
  // Places come from Match 11 points. Without them the order is only seeding,
  // so the champion is the one place that can still be named.
  const placesKnown = finalists.some((row) => row.championshipPoints !== null);
  const placeOf = (index: number, isChampion: boolean) =>
    placesKnown ? PLACE_LABEL[index] : isChampion ? PLACE_LABEL[0] : 'Finalist';
  const myFinalIndex = finalists.findIndex((row) => row.isMe);
  const isComplete = snapshot.phase === 'complete';

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <SeasonScreenHeader
        title="Season recap"
        subtitle={league?.name ?? undefined}
      />

      {standingsQuery.isLoading ? (
        <CenteredLoading label="Loading recap..." />
      ) : standingsQuery.isError ? (
        <CenteredError
          title="Recap unavailable"
          error={standingsQuery.error}
          fallback="Season results could not be loaded."
          onRetry={standingsQuery.refetch}
        />
      ) : !isComplete ? (
        <View className="flex-1 items-center justify-center px-8">
          <Crown color="#555" size={40} />
          <Text className="text-white text-[16px] font-semibold mt-4">Season in progress</Text>
          <Text className="text-gray-400 text-[12px] text-center mt-1 mb-5">
            {`The recap unlocks once Match ${CHAMPIONSHIP_MATCH} crowns a champion.`}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            className="bg-[#8B3DFF] px-5 py-2.5 rounded-full"
            onPress={() =>
              navigation.replace('LeagueChampionship', { leagueId, fantasyTeamId })
            }
          >
            <Text className="text-white text-[13px] font-medium">See the championship race</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={standingsQuery.isFetching}
              onRefresh={() => {
                standingsQuery.refetch();
                championshipQuery.refetch();
              }}
              tintColor="#8B3DFF"
            />
          }
        >
          {/* Champion */}
          <View className="bg-[#2a2210] border border-[#E0B566] rounded-[28px] p-6 mb-4 items-center">
            <Crown color="#E0B566" size={40} />
            <Text className="text-[#E0B566] text-[11px] uppercase font-bold tracking-widest mt-3">
              League champion
            </Text>
            <Text className="text-white text-[24px] font-bold mt-1 text-center">
              {season.teamName(snapshot.championFantasyTeamId) ?? 'Champion'}
            </Text>
            {String(snapshot.championFantasyTeamId) === String(fantasyTeamId) ? (
              <Text className="text-[#E0B566] text-[13px] font-semibold mt-2">
                That's you. Congratulations!
              </Text>
            ) : null}
          </View>

          {/* Me */}
          {myStanding ? (
            <SectionCard label="Your season">
              <View className="flex-row">
                <RecapStat label="Season rank" value={`#${myStanding.rank}`} />
                <RecapStat label="Season points" value={formatTotalPoints(Number(myStanding.pointsFor ?? 0))} />
                <RecapStat
                  label="Final"
                  value={
                    myFinalIndex >= 0
                      ? placeOf(myFinalIndex, finalists[myFinalIndex].isChampion)
                      : 'Missed'
                  }
                />
              </View>
            </SectionCard>
          ) : null}

          {/* Final four */}
          {finalists.length ? (
            <SectionCard label={`Match ${CHAMPIONSHIP_MATCH} final`}>
              {finalists.map((row, index) => (
                <View
                  key={row.fantasyTeamId}
                  className="flex-row items-center py-2.5 border-b border-[#1d1d1d]"
                >
                  <Medal
                    color={placesKnown || row.isChampion ? PLACE_COLOR[row.isChampion ? 0 : index] : '#555'}
                    size={20}
                  />
                  <View className="flex-1 ml-3 mr-2">
                    <Text
                      className={`text-[14px] font-bold ${row.isMe ? 'text-[#E0B566]' : 'text-white'}`}
                      numberOfLines={1}
                    >
                      {row.teamName}
                    </Text>
                    <Text className="text-gray-500 text-[11px]">
                      {`${placeOf(index, row.isChampion)} • Seed ${row.seed}`}
                    </Text>
                  </View>
                  <Text className="text-white text-[14px] font-bold">
                    {row.championshipPoints === null ? '-' : formatTotalPoints(row.championshipPoints)}
                  </Text>
                </View>
              ))}
            </SectionCard>
          ) : null}

          {/* Regular season */}
          <SectionCard label={`Regular season (Matches 1-${REGULAR_SEASON_MATCHES})`}>
            {[...standings]
              .sort((a, b) => a.rank - b.rank)
              .map((row) => {
                const isMe = String(row.fantasyTeamId) === String(fantasyTeamId);
                return (
                  <View
                    key={String(row.fantasyTeamId)}
                    className={`flex-row items-center px-2 py-2 rounded-[12px] ${isMe ? 'bg-[#8B3DFF]/20' : ''}`}
                  >
                    <Text className="text-[#E0B566] text-[12px] font-bold w-9">{`#${row.rank}`}</Text>
                    <Text
                      className={`flex-1 text-[13px] font-semibold ${isMe ? 'text-[#E0B566]' : 'text-white'}`}
                      numberOfLines={1}
                    >
                      {row.teamName}
                    </Text>
                    <Text className="text-white text-[13px] font-bold">
                      {formatTotalPoints(Number(row.pointsFor ?? 0))}
                    </Text>
                  </View>
                );
              })}
          </SectionCard>
          <View className="h-10" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function RecapStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-white text-[16px] font-bold" numberOfLines={1}>
        {value}
      </Text>
      <Text className="text-gray-500 text-[10px] uppercase font-bold mt-0.5">{label}</Text>
    </View>
  );
}
