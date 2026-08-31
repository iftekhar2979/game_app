import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers3,
  Radio,
  ShieldAlert,
  Trophy,
  Upload,
  Users,
} from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootStackParamList } from '../../../App';
import { RootState } from '../../store';
import {
  useGetAdminCheerDashboardQuery,
  usePublishAdminCheerPerformanceMutation,
  useUpdateAdminCompetitionStatusMutation,
  useUpdateAdminCheerSeasonStatusMutation,
} from '../../store/api/adminCheerApi';
import { showToast } from '../../utils/toast';
import {
  CHEER_DIVISIONS,
  DIVISION_WIN_BONUSES,
  GRAND_CHAMPION_BONUS,
  HIT_ZERO_BONUS,
  LAST_PLACE_PENALTIES,
  SCORE_BANDS,
  getCheerPerformanceFantasyPreview,
} from '../../utils/cheerScoring';
import type { AdminCheerStep } from './AdminCheerFormScreen';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'AdminCheer'>;

const workflow: Array<{
  step: AdminCheerStep;
  number: number;
  title: string;
  detail: string;
}> = [
  {
    step: 'season',
    number: 1,
    title: 'Season',
    detail: 'Dates and registration window',
  },
  {
    step: 'organization',
    number: 2,
    title: 'Country / program',
    detail: 'Country and real gym, school, or club',
  },
  {
    step: 'division',
    number: 3,
    title: 'Division',
    detail: 'Draft roster category',
  },
  {
    step: 'fantasyTeam',
    number: 4,
    title: 'Cheer team',
    detail: 'Draftable real-world team',
  },
  {
    step: 'competition',
    number: 5,
    title: 'Competition',
    detail: 'Event and head-to-head fantasy period',
  },
  {
    step: 'entry',
    number: 6,
    title: 'Event entry',
    detail: 'Team and division',
  },
  {
    step: 'score',
    number: 7,
    title: 'Official result',
    detail: 'Score, placement, and bonuses',
  },
];

const nextCompetitionStatus: Record<
  string,
  { status: string; label: string } | undefined
> = {
  draft: { status: 'registration_open', label: 'Open registration' },
  registration_open: {
    status: 'registration_closed',
    label: 'Close registration',
  },
  registration_closed: { status: 'live', label: 'Go live' },
  live: { status: 'completed', label: 'Complete event' },
};

const nextSeasonStatus: Record<
  string,
  { status: string; label: string } | undefined
> = {
  draft: { status: 'registration_open', label: 'Open season registration' },
  registration_open: { status: 'active', label: 'Start season' },
  active: { status: 'completed', label: 'Complete season' },
};

const humanize = (value?: string) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

const getId = (value: any) => String(value?._id ?? value?.id ?? value ?? '');

const sumStatuses = (
  statuses: Record<string, number> | undefined,
  keys: string[],
) => keys.reduce((total, key) => total + Number(statuses?.[key] || 0), 0);

export default function AdminCheerScreen() {
  const navigation = useNavigation<Navigation>();
  const role = useSelector((state: RootState) => state.auth.user?.role);
  const [seasonId, setSeasonId] = useState<string | undefined>();
  const { data, isLoading, isFetching, error, refetch } =
    useGetAdminCheerDashboardQuery(seasonId);
  const [publishPerformance, { isLoading: isPublishing }] =
    usePublishAdminCheerPerformanceMutation();
  const [advanceCompetition, { isLoading: isAdvancing }] =
    useUpdateAdminCompetitionStatusMutation();
  const [advanceSeason, { isLoading: isAdvancingSeason }] =
    useUpdateAdminCheerSeasonStatusMutation();

  const seasons = data?.referenceData?.seasons ?? [];
  useEffect(() => {
    if (!seasonId && seasons.length) setSeasonId(getId(seasons[0]));
  }, [seasonId, seasons]);

  const selectedSeason = useMemo(
    () => seasons.find(season => getId(season) === seasonId),
    [seasonId, seasons],
  );
  const scoringQueue = useMemo(
    () =>
      (data?.scoringQueue ?? []).map(performance => ({
        ...performance,
        fantasyPreview: getCheerPerformanceFantasyPreview(performance),
      })),
    [data?.scoringQueue],
  );
  const draftableTeamCount =
    data?.counts?.seasonTeams ?? data?.counts?.teams ?? 0;
  const configuredDivisionCount = data?.counts?.divisions ?? 0;
  const liveCompetitionCount = sumStatuses(data?.statusCounts?.competitions, [
    'live',
  ]);
  const registrationCompetitionCount = sumStatuses(
    data?.statusCounts?.competitions,
    ['registration_open'],
  );
  const confirmedEntryCount = sumStatuses(data?.statusCounts?.entries, [
    'confirmed',
  ]);
  const publishedResultCount = sumStatuses(data?.statusCounts?.performances, [
    'published',
    'official',
  ]);
  const readinessChecks = [
    {
      label: 'Standard divisions',
      detail: `${configuredDivisionCount} of ${CHEER_DIVISIONS.length} configured`,
      ready: configuredDivisionCount >= CHEER_DIVISIONS.length,
    },
    {
      label: 'Draftable team pool',
      detail: `${draftableTeamCount} real-world teams available`,
      ready: draftableTeamCount > 0,
    },
    {
      label: 'Result publishing',
      detail: scoringQueue.length
        ? `${scoringQueue.length} official results awaiting publication`
        : 'Publishing queue is clear',
      ready: scoringQueue.length === 0,
    },
  ];

  if (role !== 'admin') {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-8">
        <ShieldAlert color="#E0B566" size={42} />
        <Text className="text-white text-xl font-semibold mt-5">
          Admin access required
        </Text>
        <Text className="text-gray-400 text-center mt-2">
          This console is only available to verified platform administrators.
        </Text>
        <TouchableOpacity
          className="mt-7 border border-white/30 rounded-xl px-6 py-3"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white">Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const publish = async (performanceId: string) => {
    try {
      await publishPerformance(performanceId).unwrap();
      showToast.success(
        'Published',
        'Official results and fantasy points were recalculated.',
      );
    } catch (requestError: any) {
      showToast.error(
        'Publish failed',
        requestError?.data?.message || 'Please try again.',
      );
    }
  };

  const advance = async (competition: any) => {
    const next = nextCompetitionStatus[competition.status];
    if (!next) return;
    try {
      await advanceCompetition({
        competitionId: getId(competition),
        status: next.status,
      }).unwrap();
      showToast.success(
        'Status updated',
        `${competition.name} is now ${humanize(next.status)}.`,
      );
    } catch (requestError: any) {
      showToast.error(
        'Update failed',
        requestError?.data?.message || 'Please try again.',
      );
    }
  };

  const advanceSelectedSeason = async () => {
    const next = nextSeasonStatus[selectedSeason?.status];
    if (!selectedSeason || !next) return;
    try {
      await advanceSeason({
        seasonId: getId(selectedSeason),
        status: next.status,
      }).unwrap();
      showToast.success(
        'Season updated',
        `${selectedSeason.name} is now ${humanize(next.status)}.`,
      );
    } catch (requestError: any) {
      showToast.error(
        'Update failed',
        requestError?.data?.message || 'Please try again.',
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <TouchableOpacity
          className="w-10 h-10 rounded-xl border border-white/20 items-center justify-center"
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color="#fff" size={23} />
        </TouchableOpacity>
        <View className="ml-4 flex-1">
          <Text className="text-white text-xl font-semibold">
            Cheer Battle Admin
          </Text>
          <Text className="text-[#E0B566] text-xs mt-0.5">TEAM OPERATIONS</Text>
        </View>
        {isFetching && <ActivityIndicator color="#E0B566" />}
      </View>

      {isLoading && !data ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#E0B566" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <ShieldAlert color="#ef4444" size={38} />
          <Text className="text-white font-semibold mt-4">
            Could not load admin operations
          </Text>
          <TouchableOpacity
            className="mt-5 bg-[#E0B566] rounded-xl px-6 py-3"
            onPress={refetch}
          >
            <Text className="text-black font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={refetch}
              tintColor="#E0B566"
            />
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-gray-400 text-xs mb-2">OPERATING SEASON</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-5"
          >
            {seasons.map(season => {
              const active = getId(season) === seasonId;
              return (
                <TouchableOpacity
                  key={getId(season)}
                  onPress={() => setSeasonId(getId(season))}
                  className={`mr-2 px-4 py-3 rounded-xl border ${
                    active
                      ? 'bg-[#E0B566] border-[#E0B566]'
                      : 'bg-[#171717] border-white/15'
                  }`}
                >
                  <Text
                    className={
                      active ? 'text-black font-semibold' : 'text-white'
                    }
                  >
                    {season.name}
                  </Text>
                  <Text
                    className={
                      active
                        ? 'text-black/60 text-xs mt-0.5'
                        : 'text-gray-500 text-xs mt-0.5'
                    }
                  >
                    {humanize(season.status)}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {!seasons.length && (
              <Text className="text-gray-500 py-3">
                Create the first season below.
              </Text>
            )}
          </ScrollView>

          {selectedSeason && nextSeasonStatus[selectedSeason.status] && (
            <TouchableOpacity
              disabled={isAdvancingSeason}
              onPress={advanceSelectedSeason}
              className="border border-[#E0B566]/50 bg-[#2B2112] rounded-xl py-3 items-center mb-5"
            >
              {isAdvancingSeason ? (
                <ActivityIndicator color="#E0B566" />
              ) : (
                <Text className="text-[#E0B566] font-semibold">
                  {nextSeasonStatus[selectedSeason.status]?.label}
                </Text>
              )}
            </TouchableOpacity>
          )}

          <View className="bg-[#2B2112] border border-[#E0B566]/30 rounded-2xl p-4 mb-5">
            <Text className="text-[#E0B566] text-xs font-semibold">
              TEAM-BASED FANTASY
            </Text>
            <Text className="text-white font-semibold mt-1">
              Managers draft real-world cheer teams
            </Text>
            <Text className="text-gray-400 text-xs leading-5 mt-1">
              Each fantasy roster competes head-to-head based on its teams'
              official results. Individual athletes are not fantasy assets.
            </Text>
          </View>

          <View className="flex-row flex-wrap -mx-1 mb-6">
            {[
              ['Competitions', data?.counts?.competitions ?? 0, Trophy],
              ['Draftable teams', draftableTeamCount, Users],
              ['Standard divisions', configuredDivisionCount, Layers3],
              [
                'Results to publish',
                data?.counts?.unpublishedScores ?? 0,
                Upload,
              ],
            ].map(([label, value, Icon]: any) => (
              <View key={label} className="w-1/2 px-1 mb-2">
                <View className="bg-[#171717] border border-white/10 rounded-2xl p-4">
                  <Icon color="#E0B566" size={19} />
                  <Text className="text-white text-2xl font-bold mt-3">
                    {value}
                  </Text>
                  <Text className="text-gray-400 text-xs mt-1">{label}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text className="text-white text-lg font-semibold mb-3">
            System readiness
          </Text>
          <View className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden mb-5">
            {readinessChecks.map((check, index) => (
              <View
                key={check.label}
                className={`flex-row items-center px-4 py-4 ${
                  index < readinessChecks.length - 1
                    ? 'border-b border-white/10'
                    : ''
                }`}
              >
                {check.ready ? (
                  <CheckCircle2 color="#22c55e" size={20} />
                ) : (
                  <ShieldAlert color="#f59e0b" size={20} />
                )}
                <View className="ml-3 flex-1">
                  <Text className="text-white font-medium">{check.label}</Text>
                  <Text className="text-gray-500 text-xs mt-0.5">
                    {check.detail}
                  </Text>
                </View>
                <Text
                  className={
                    check.ready
                      ? 'text-green-500 text-xs'
                      : 'text-amber-500 text-xs'
                  }
                >
                  {check.ready ? 'Ready' : 'Action needed'}
                </Text>
              </View>
            ))}
          </View>

          <View className="bg-[#171717] border border-white/10 rounded-2xl p-4 mb-7">
            <Text className="text-white font-semibold">Current activity</Text>
            <View className="flex-row flex-wrap -mx-1 mt-3">
              {[
                ['Live events', liveCompetitionCount],
                ['Registration open', registrationCompetitionCount],
                ['Confirmed entries', confirmedEntryCount],
                ['Published results', publishedResultCount],
              ].map(([label, value]) => (
                <View key={label} className="w-1/2 px-1 mb-2">
                  <View className="bg-black/30 rounded-xl px-3 py-3">
                    <Text className="text-[#E0B566] text-lg font-bold">
                      {value}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-0.5">
                      {label}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <Text className="text-white text-lg font-semibold mb-1">
            Admin operations
          </Text>
          <Text className="text-gray-500 text-sm mb-3">
            Manage the team catalog and event results in operating order.
          </Text>
          <View className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden mb-7">
            {workflow.map((item, index) => (
              <TouchableOpacity
                key={item.step}
                className={`flex-row items-center px-4 py-4 ${
                  index < workflow.length - 1 ? 'border-b border-white/10' : ''
                }`}
                onPress={() =>
                  navigation.navigate('AdminCheerForm', { step: item.step })
                }
              >
                <View className="w-8 h-8 rounded-full bg-[#2B2112] items-center justify-center mr-3">
                  <Text className="text-[#E0B566] font-semibold">
                    {item.number}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-white font-medium">{item.title}</Text>
                  <Text className="text-gray-500 text-xs mt-0.5">
                    {item.detail}
                  </Text>
                </View>
                <ChevronRight color="#777" size={19} />
              </TouchableOpacity>
            ))}
          </View>

          <View className="bg-[#111] border border-white/10 rounded-2xl p-4 mb-7">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-white font-semibold">
                  Standard fantasy scoring
                </Text>
                <Text className="text-gray-500 text-xs mt-1">
                  One fixed scoring system applies to every league.
                </Text>
              </View>
              <Trophy color="#E0B566" size={22} />
            </View>
            <View className="mt-4 pt-4 border-t border-white/10">
              <Text className="text-gray-300 text-xs leading-5">
                {SCORE_BANDS.length} official score bands · Division win +
                {DIVISION_WIN_BONUSES[0].points} / +
                {DIVISION_WIN_BONUSES[1].points} / +
                {DIVISION_WIN_BONUSES[2].points}
              </Text>
              <Text className="text-gray-300 text-xs leading-5">
                Hit zero +{HIT_ZERO_BONUS} · Grand champion +
                {GRAND_CHAMPION_BONUS} · Last place -
                {Math.abs(LAST_PLACE_PENALTIES[0].points)} / -
                {Math.abs(LAST_PLACE_PENALTIES[1].points)}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between mb-3">
            <View>
              <Text className="text-white text-lg font-semibold">
                Competition control
              </Text>
              <Text className="text-gray-500 text-xs mt-0.5">
                {selectedSeason?.name || 'All seasons'}
              </Text>
            </View>
            <Radio color="#E0B566" size={21} />
          </View>
          {(data?.recentCompetitions ?? []).map(competition => {
            const next = nextCompetitionStatus[competition.status];
            return (
              <View
                key={getId(competition)}
                className="bg-[#171717] border border-white/10 rounded-2xl p-4 mb-3"
              >
                <View className="flex-row items-start">
                  <CalendarDays color="#E0B566" size={19} />
                  <View className="ml-3 flex-1">
                    <Text className="text-white font-semibold">
                      {competition.name}
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      Period {competition.fantasyPeriod} ·{' '}
                      {humanize(competition.status)} ·{' '}
                      {competition.divisionIds?.length ?? 0} divisions
                    </Text>
                  </View>
                </View>
                {next && (
                  <TouchableOpacity
                    disabled={isAdvancing}
                    className="mt-4 border border-[#E0B566]/50 rounded-xl py-2.5 items-center"
                    onPress={() => advance(competition)}
                  >
                    <Text className="text-[#E0B566] font-medium">
                      {next.label}
                    </Text>
                  </TouchableOpacity>
                )}
                {!next && competition.status === 'completed' && (
                  <View className="flex-row items-center mt-3">
                    <CheckCircle2 color="#22c55e" size={16} />
                    <Text className="text-green-500 text-xs ml-2">
                      Event complete
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
          {!data?.recentCompetitions?.length && (
            <Text className="text-gray-500 mb-7">
              No competitions in this season yet.
            </Text>
          )}

          <Text className="text-white text-lg font-semibold mb-3">
            Team result queue
          </Text>
          {scoringQueue.map(performance => (
            <View
              key={getId(performance)}
              className="bg-[#171717] border border-white/10 rounded-2xl p-4 mb-3"
            >
              <Text className="text-white font-semibold">
                {performance.entryId?.teamName || 'Competition entry'}
              </Text>
              <Text className="text-gray-500 text-xs mt-1">
                {performance.competitionId?.name || 'Competition'} ·{' '}
                {performance.entryId?.organizationId?.country ||
                  performance.entryId?.country ||
                  'Country unavailable'}
              </Text>
              <Text className="text-gray-400 text-xs mt-1">
                {performance.entryId?.divisionId?.name ||
                  performance.entryId?.divisionId?.code ||
                  'Division unavailable'}{' '}
                · Official {performance.finalScore ?? '—'}
              </Text>
              <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-white/10">
                <Text className="text-gray-400 text-xs">
                  Fantasy point preview
                </Text>
                <Text className="text-[#E0B566] text-lg font-bold">
                  {performance.fantasyPoints ??
                    performance.fantasyPreview?.totalPoints ??
                    '—'}{' '}
                  pts
                </Text>
              </View>
              {performance.fantasyPreview && (
                <Text className="text-gray-600 text-[10px] mt-1 text-right">
                  Score {performance.fantasyPreview.scorePoints} · division{' '}
                  {performance.fantasyPreview.divisionResultPoints} · hit zero{' '}
                  {performance.fantasyPreview.hitZeroPoints} · champion{' '}
                  {performance.fantasyPreview.grandChampionPoints}
                </Text>
              )}
              <TouchableOpacity
                disabled={isPublishing}
                className="bg-[#E0B566] rounded-xl py-3 items-center mt-4"
                onPress={() => publish(getId(performance))}
              >
                <Text className="text-black font-semibold">
                  Publish official result
                </Text>
              </TouchableOpacity>
            </View>
          ))}
          {!scoringQueue.length && (
            <View className="bg-[#111] border border-white/10 rounded-2xl p-5 items-center">
              <CheckCircle2 color="#22c55e" size={25} />
              <Text className="text-white mt-3">Publishing queue is clear</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
