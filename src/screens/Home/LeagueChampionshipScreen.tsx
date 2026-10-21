import React from 'react';
import { RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Crown, Trophy } from 'lucide-react-native';
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
import {
  type FinalistRow,
  useSeasonStandings,
} from '../../components/LeagueDetail/useSeasonStandings';
import {
  CHAMPIONSHIP_MATCH,
  FINALIST_COUNT,
  REGULAR_SEASON_MATCHES,
} from '../../components/LeagueDetail/seasonRules';
import { formatTotalPoints } from '../../components/LeagueDetail/LeagueDetailTabs';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'LeagueChampionship'>;
type RouteProps = RouteProp<RootStackParamList, 'LeagueChampionship'>;

export default function LeagueChampionshipScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { leagueId, fantasyTeamId } = useRoute<RouteProps>().params;
  const { league } = useLeagueSeasonContext(leagueId);
  const season = useSeasonStandings(leagueId, league, fantasyTeamId);
  const { snapshot, finalists, standings, standingsQuery, championshipQuery } = season;

  const refresh = () => {
    standingsQuery.refetch();
    if (snapshot.finalistsAreLocked) championshipQuery.refetch();
  };

  const phaseText =
    snapshot.phase === 'complete'
      ? 'Season complete'
      : snapshot.phase === 'championship'
        ? `Match ${CHAMPIONSHIP_MATCH} • Championship final`
        : `Match ${Math.min(snapshot.currentMatch, REGULAR_SEASON_MATCHES)} of ${REGULAR_SEASON_MATCHES} • Regular season`;

  // The first team outside the projected four, and how far it is behind.
  const bubble =
    snapshot.phase === 'regular'
      ? [...standings].sort((a, b) => a.rank - b.rank)[FINALIST_COUNT]
      : undefined;
  const cutLine = snapshot.finalists[FINALIST_COUNT - 1];

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <SeasonScreenHeader title="Championship" subtitle={phaseText} />

      {standingsQuery.isLoading ? (
        <CenteredLoading label="Loading championship..." />
      ) : standingsQuery.isError ? (
        <CenteredError
          title="Championship unavailable"
          error={standingsQuery.error}
          fallback="Standings could not be loaded."
          onRetry={standingsQuery.refetch}
        />
      ) : (
        <ScrollView
          className="flex-1 px-5 pt-4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={standingsQuery.isFetching || championshipQuery.isFetching}
              onRefresh={refresh}
              tintColor="#8B3DFF"
            />
          }
        >
          {snapshot.phase === 'complete' ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => navigation.navigate('SeasonRecap', { leagueId, fantasyTeamId })}
              className="bg-[#2a2210] border border-[#E0B566] rounded-[24px] p-5 mb-4 items-center"
            >
              <Crown color="#E0B566" size={32} />
              <Text className="text-[#E0B566] text-[11px] uppercase font-bold tracking-wider mt-2">
                League champion
              </Text>
              <Text className="text-white text-[22px] font-bold mt-1 text-center">
                {season.teamName(snapshot.championFantasyTeamId) ?? 'Champion'}
              </Text>
              <Text className="text-gray-300 text-[12px] mt-2">View season recap ›</Text>
            </TouchableOpacity>
          ) : null}

          <SectionCard label="How it works">
            <Text className="text-gray-300 text-[13px] leading-5">
              {`The top ${FINALIST_COUNT} teams after Match ${REGULAR_SEASON_MATCHES} reach the final. In Match ${CHAMPIONSHIP_MATCH}, the finalist who scores the most points wins the league. Ties go to the higher regular-season total, then the higher seed.`}
            </Text>
          </SectionCard>

          <Text className="text-white text-[16px] font-bold mb-3">
            {snapshot.finalistsAreLocked ? 'Finalists' : 'Projected finalists'}
          </Text>
          {finalists.length === 0 ? (
            <Text className="text-gray-500 text-[12px] mb-4">No standings yet.</Text>
          ) : (
            finalists.map((row, index) => (
              <FinalistCard
                key={row.fantasyTeamId}
                row={row}
                position={index + 1}
                showChampionshipPoints={snapshot.finalistsAreLocked}
              />
            ))
          )}

          {snapshot.finalistsAreLocked && championshipQuery.isError ? (
            <Text className="text-gray-500 text-[12px] mb-4">
              {`Match ${CHAMPIONSHIP_MATCH} scores are not available yet.`}
            </Text>
          ) : null}

          {bubble && cutLine ? (
            <SectionCard label="On the bubble" className="mt-2">
              <Text className="text-white text-[14px] font-semibold">
                {`#${bubble.rank} ${bubble.teamName}`}
              </Text>
              <Text className="text-gray-400 text-[12px] mt-1">
                {`${formatTotalPoints(Math.max(0, cutLine.regularSeasonTotal - Number(bubble.pointsFor ?? 0)))} points behind the final spot`}
              </Text>
            </SectionCard>
          ) : null}
          <View className="h-10" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function FinalistCard({
  row,
  position,
  showChampionshipPoints,
}: {
  row: FinalistRow;
  position: number;
  showChampionshipPoints: boolean;
}) {
  const highlight = row.isChampion
    ? 'bg-[#2a2210] border-[#E0B566]'
    : row.isMe
      ? 'bg-[#8B3DFF]/20 border-[#8B3DFF]'
      : 'bg-[#111] border-[#222]';

  return (
    <View
      accessibilityLabel={`${row.teamName}, seed ${row.seed}`}
      className={`flex-row items-center border rounded-[20px] p-4 mb-3 ${highlight}`}
    >
      <View className="w-10 h-10 rounded-full bg-black border border-[#333] items-center justify-center mr-3">
        {row.isChampion ? (
          <Trophy color="#E0B566" size={18} />
        ) : (
          <Text className="text-[#E0B566] text-[13px] font-bold">
            {showChampionshipPoints && row.championshipPoints !== null ? position : `#${row.seed}`}
          </Text>
        )}
      </View>
      <View className="flex-1 mr-3">
        <Text className="text-white text-[15px] font-bold" numberOfLines={1}>
          {row.teamName}
          {row.isMe ? <Text className="text-[#E0B566] text-[11px]">  YOU</Text> : null}
        </Text>
        <Text className="text-gray-500 text-[11px]" numberOfLines={1}>
          {`Seed ${row.seed} • ${formatTotalPoints(row.regularSeasonTotal)} season pts`}
        </Text>
      </View>
      {showChampionshipPoints ? (
        <View className="items-end">
          <Text className="text-gray-400 text-[10px]">{`Match ${CHAMPIONSHIP_MATCH}`}</Text>
          <Text className="text-white text-[16px] font-bold">
            {row.championshipPoints === null ? '-' : formatTotalPoints(row.championshipPoints)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
