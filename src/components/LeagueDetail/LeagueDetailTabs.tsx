import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Share,
} from 'react-native';
import {
  Plus,
  CalendarClock,
  Users,
  UserCheck,
  Shield,
  Settings,
  ChevronRight,
  Search,
  X,
  User,
} from 'lucide-react-native';

import {
  useGetLeagueMatchScoresQuery,
  useGetLeagueStandingsQuery,
  type LeagueMatchScoresResponse,
  type SeasonMatch,
} from '../../store/api/leagueApi';
import {
  MatchScoresSkeleton,
  RosterSkeleton,
  StandingsSkeleton,
  TeamListFooterSkeleton,
  TeamListSkeleton,
} from '../Skeleton';
import { RosterSections } from './RosterPlayerRow';
import { resolveDraftStartsAt } from './draftSchedule';
export { ScoringRulesTab } from '../Scoring/FixedScoringRules';

export const formatTotalPoints = (points: number) => points.toFixed(2);

interface MatchTabProps {
  leagueId: string;
  matches: SeasonMatch[];
  matchesLoading: boolean;
  matchesError: boolean;
  selectedMatchNumber: number | null;
  onSelectMatch: (matchNumber: number) => void;
  onRetryMatches: () => void;
}

export const MatchTab = ({
  leagueId,
  matches,
  matchesLoading,
  matchesError,
  selectedMatchNumber,
  onSelectMatch,
  onRetryMatches,
}: MatchTabProps) => {
  const {
    currentData: scores,
    isLoading: scoresLoading,
    isFetching: scoresFetching,
    isError: scoresError,
    refetch: refetchScores,
  } = useGetLeagueMatchScoresQuery(
    { leagueId, matchNumber: selectedMatchNumber ?? 0 },
    { skip: !leagueId || !selectedMatchNumber || leagueId.startsWith('mock-') },
  );

  if (matchesLoading || ((scoresLoading || scoresFetching) && !scores)) {
    return <MatchScoresSkeleton />;
  }

  if (matchesError || scoresError) {
    return (
      <View className="bg-[#1e1e1e] border border-[#333] rounded-[24px] p-6 mb-6 items-center">
        <Text className="text-white text-[15px] font-semibold mb-2">
          Unable to load Match scores
        </Text>
        <Text className="text-gray-400 text-[12px] text-center mb-4">
          Please check your connection and try again.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Retry loading Match scores"
          className="bg-[#8B3DFF] px-5 py-2.5 rounded-full"
          onPress={() => {
            if (matchesError) onRetryMatches();
            if (scoresError && selectedMatchNumber) refetchScores();
          }}
        >
          <Text className="text-white text-[13px] font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (matches.length === 0 || selectedMatchNumber === null) {
    return (
      <View className="bg-[#1e1e1e] border border-[#333] rounded-[24px] p-6 mb-6 items-center">
        <Text className="text-gray-400 text-[13px] text-center">
          No Matches are available for this season yet.
        </Text>
      </View>
    );
  }

  if (!scores) {
    return <MatchScoresSkeleton />;
  }

  const entries = scores.entries;
  const allScoresZero = entries.length > 0 && entries.every(entry => entry.points === 0);

  return (
    <View className="mb-6 mt-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-5"
        accessibilityLabel="Select a Match"
      >
        {matches.map(match => (
          <TouchableOpacity
            key={match._id || String(match.number)}
            accessibilityRole="button"
            accessibilityLabel={`Match ${match.number}`}
            accessibilityState={{ selected: match.number === selectedMatchNumber }}
            className={`px-4 py-2.5 rounded-xl border mr-2 ${
              match.number === selectedMatchNumber
                ? 'bg-[#8B3DFF]/20 border-[#8B3DFF]'
                : 'bg-[#171717] border-[#333]'
            }`}
            onPress={() => onSelectMatch(match.number)}
          >
            <Text className={`text-[13px] font-semibold ${
              match.number === selectedMatchNumber ? 'text-white' : 'text-gray-400'
            }`}>
              Match {match.number}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="flex-row items-center mb-4">
        <Text className="text-white text-[20px] font-bold mr-3">
          Match {scores.matchNumber}
        </Text>
        {scores.isCurrentMatch ? (
          <View className="px-2.5 py-1 rounded-full border border-[#E0B566]/50 bg-[#E0B566]/15">
            <Text className="text-[#E0B566] text-[10px] font-bold uppercase">
              Current
            </Text>
          </View>
        ) : null}
      </View>

      {scores.me ? (
        <View className="bg-[#1e1e1e] border border-[#8B3DFF] rounded-[24px] p-5 mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-gray-400 text-[13px]">My Score</Text>
            <Text className="text-white text-[22px] font-extrabold">
              {formatTotalPoints(scores.me.points)}
            </Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-400 text-[13px]">My Rank</Text>
            <Text className="text-[#E0B566] text-[18px] font-bold">
              #{scores.me.rank} of {entries.length}
            </Text>
          </View>
        </View>
      ) : null}

      <Text className="text-white text-[18px] font-bold mb-4">
        League Match Scores
      </Text>
      <View className="bg-[#111] border border-[#222] rounded-[20px] p-3">
        {entries.length === 0 ? (
          <Text className="text-gray-400 text-[13px] text-center p-4">
            No league Match scores are available yet.
          </Text>
        ) : (
          entries.map(entry => (
            <View
              key={entry.fantasyTeamId}
              testID={`league-match-row-${entry.fantasyTeamId}`}
              accessibilityState={{ selected: entry.isCurrentUser }}
              className={`flex-row items-center p-3 rounded-[16px] mb-2 border ${
                entry.isCurrentUser
                  ? 'bg-[#8B3DFF]/20 border-[#8B3DFF]'
                  : 'bg-[#181818] border-[#222]'
              }`}
            >
              <Text className="text-[#E0B566] text-[13px] font-bold w-9">
                {entry.rank}
              </Text>
              <Text
                className={`flex-1 text-[14px] font-semibold ${
                  entry.isCurrentUser ? 'text-[#E0B566]' : 'text-white'
                }`}
                numberOfLines={1}
              >
                {entry.isCurrentUser ? 'You' : entry.displayName}
              </Text>
              <Text className="text-white text-[14px] font-bold ml-3">
                {formatTotalPoints(entry.points)}
              </Text>
            </View>
          ))
        )}
        {allScoresZero ? (
          <Text className="text-gray-400 text-[12px] text-center px-3 pb-3">
            Scores will appear once competition results are published.
          </Text>
        ) : null}
      </View>
    </View>
  );
};

/**
 * One unit of the pre-draft countdown. Each tile flexes to an equal share of
 * the row so the four of them always span the full card width.
 */
const CountdownUnit = ({ value, label }: { value: number; label: string }) => (
  <View className="flex-1  rounded-2xl py-2 items-center">
    <Text className="text-black text-[24px] font-bold leading-tight">
      {String(Math.max(0, value)).padStart(2, '0')}
    </Text>
    <Text className="text-black/60 text-[10px] font-bold uppercase tracking-wider mt-0.5">
      {label}
    </Text>
  </View>
);

/**
 * One draft setting as a full-width row. Rows rather than side-by-side chips:
 * three columns on a phone leaves each one too narrow for values like
 * "Auction" or "200 pts" to render without truncating.
 */
const DraftFactRow = ({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}) => (
  <View
    className={`flex-row items-center justify-between px-4 py-3 ${
      isLast ? '' : 'border-b border-black/10'
    }`}
  >
    <Text className="text-black/60 text-[12px] font-semibold">{label}</Text>
    <Text
      className="text-black text-[13px] font-bold flex-1 text-right ml-3"
      numberOfLines={1}
    >
      {value}
    </Text>
  </View>
);
export const DraftTab = ({
  isDraftStarted,
  timeLeft,
  league,
  navigation,
}: any) => {
  const effectiveJoinCode =
    league?.code ||
    league?.joinCode ||
    league?.invitationCode ||
    league?.invitations?.[0]?.prefix ||
    (league?.id || league?._id
      ? String(league?.id || league?._id).substring(0, 6).toUpperCase()
      : 'CHEER1');

  const joinCode = effectiveJoinCode;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    effectiveJoinCode,
  )}`;

  // Draft settings live at two different depths depending on the endpoint.
  const draftSettings =
    league?.draftSettings || league?.settings?.draftSettings || {};

  const draftTypeLabel = (() => {
    const type = String(draftSettings.type || '').toLowerCase();
    if (!type) return 'Not set';
    return type.charAt(0).toUpperCase() + type.slice(1);
  })();

  const pickClockLabel = (() => {
    const seconds = Number(
      draftSettings.pickDurationSeconds ?? draftSettings.biddingDurationSeconds,
    );
    if (!Number.isFinite(seconds) || seconds <= 0) return 'Not set';
    if (seconds % 60 === 0) return `${seconds / 60} min`;
    return `${seconds}s`;
  })();

  const budgetLabel = (() => {
    const budget = Number(draftSettings.startingBudget);
    return Number.isFinite(budget) && budget > 0 ? `${budget} pts` : 'Not set';
  })();

  const joinedTeams = Number(
    league?.joinedTeamCount ?? league?.membersCount ?? 0,
  );
  const maxTeams = Number(league?.maxTeams ?? 0);
  const fillRatio =
    maxTeams > 0 ? Math.min(1, Math.max(0, joinedTeams / maxTeams)) : 0;
  const isLeagueFull = maxTeams > 0 && joinedTeams >= maxTeams;

  // The countdown hitting zero does not by itself mean the server started the
  // draft, so this is a distinct waiting state rather than a live one.
  const hasCountdown =
    !!timeLeft &&
    (timeLeft.days > 0 ||
      timeLeft.hours > 0 ||
      timeLeft.minutes > 0 ||
      timeLeft.seconds > 0);
  const isAwaitingStart = !!timeLeft && !hasCountdown;

  const draftTimeFormatted = (() => {
    const rawDate = resolveDraftStartsAt(league);

    if (!rawDate) return 'Draft time to be scheduled';
    try {
      const d = new Date(rawDate);
      return `${d.toDateString()} ${d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } catch {
      return 'Draft scheduled';
    }
  })();

  return (
    <View>
      {/* Draftboard Card */}
      {!isDraftStarted ? (
        <View className="bg-[#FFB84D] rounded-[24px] p-5 mb-8">
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1 pr-3">
              <Text className="text-black text-[17px] font-bold mb-1">
                Draftboard
              </Text>
              <View className="flex-row items-center">
                <CalendarClock color="rgba(0,0,0,0.55)" size={13} />
                <Text
                  className="text-black/70 text-[12px] ml-1.5 flex-1"
                  numberOfLines={2}
                >
                  {draftTimeFormatted}
                </Text>
              </View>
            </View>
            <View className="bg-black/10 border border-black/20 px-3 py-1.5 rounded-full">
              <Text className="text-black text-[11px] font-bold">
                {isAwaitingStart ? 'Starting' : 'Scheduled'}
              </Text>
            </View>
          </View>

          {/* Countdown */}
          <Text className="text-black/60 text-[10px] font-bold uppercase tracking-wider mb-2">
            {isAwaitingStart ? 'Waiting for the server' : 'Draft starts in'}
          </Text>
          <View className="flex-row gap-1 mb-5">
            <CountdownUnit value={timeLeft?.days ?? 0} label="Days" />
            <CountdownUnit value={timeLeft?.hours ?? 0} label="Hours" />
            <CountdownUnit value={timeLeft?.minutes ?? 0} label="Min" />
            <CountdownUnit value={timeLeft?.seconds ?? 0} label="Sec" />
          </View>

          {/* Draft settings at a glance */}
          <View className="bg-black/10 border border-black/10 rounded-2xl mb-5">
            <DraftFactRow label="Format" value={draftTypeLabel} />
            <DraftFactRow label="Pick clock" value={pickClockLabel} />
            <DraftFactRow label="Budget" value={budgetLabel} isLast />
          </View>

          {/* League fill */}
          {maxTeams > 0 ? (
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <Users color="rgba(0,0,0,0.55)" size={13} />
                  <Text className="text-black/60 text-[12px] font-semibold ml-1.5">
                    Teams joined
                  </Text>
                </View>
                <Text className="text-black text-[13px] font-bold">
                  {`${joinedTeams} / ${maxTeams}`}
                </Text>
              </View>
              <View className="h-2 rounded-full bg-black/15 overflow-hidden">
                <View
                  className="h-full rounded-full bg-[#8B3DFF]"
                  style={{ width: `${Math.round(fillRatio * 100)}%` }}
                />
              </View>
              <Text className="text-black/60 text-[11px] mt-1.5">
                {isLeagueFull
                  ? 'League is full — everyone is in.'
                  : `${maxTeams - joinedTeams} spot${
                      maxTeams - joinedTeams === 1 ? '' : 's'
                    } left — share the join code below.`}
              </Text>
            </View>
          ) : null}

          {/* Nothing can be done in the room until the scheduled time passes -
              the server refuses to start the draft before it - so the button
              waits with the countdown rather than opening an inert room. */}
          <TouchableOpacity
            className={`${
              hasCountdown ? 'bg-[#8B3DFF]/40' : 'bg-[#8B3DFF]'
            } rounded-full h-[52px] justify-center items-center`}
            activeOpacity={0.9}
            disabled={hasCountdown}
            accessibilityState={{ disabled: hasCountdown }}
            onPress={() =>
              navigation.navigate('DraftRoom', { leagueId: league?.id })
            }
          >
            <Text
              className={`${
                hasCountdown ? 'text-white/50' : 'text-white'
              } text-[16px] font-bold`}
            >
              {hasCountdown ? 'Draftroom opens at draft time' : 'Draftroom'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="bg-[#8B3DFF] rounded-[24px] p-6 mb-8 border border-[#B366FF]">
          <View className="flex-row items-center justify-center mb-2">
            <View className="w-2 h-2 rounded-full bg-white mr-2" />
            <Text className="text-white text-center text-[22px] font-bold">
              Game Started!
            </Text>
          </View>
          <Text className="text-white/80 text-center text-[14px] mb-6">
            {maxTeams > 0
              ? `The draft has begun. ${joinedTeams} of ${maxTeams} teams are drafting now.`
              : 'The draft has begun. Join your league now.'}
          </Text>
          <TouchableOpacity
            className="bg-white rounded-full h-[50px] justify-center items-center px-8"
            activeOpacity={0.9}
            onPress={() =>
              navigation.navigate('DraftRoom', { leagueId: league?.id })
            }
          >
            <Text className="text-[#8B3DFF] text-[16px] font-bold">
              Go to Draft Room
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Share / Invite Section */}
      <View className="bg-[#111] border border-[#222] rounded-[24px] p-5 mb-8">
        <Text className="text-white text-[16px] font-bold mb-1">
          Invite League Members
        </Text>
        <Text className="text-gray-400 text-[12px] mb-4">
          Share this 6-digit code or QR code with friends to join.
        </Text>

        {/* 6-Digit Join Code Box */}
        <View className="bg-[#181818] border border-[#333] rounded-2xl p-4 mb-4">
          <Text className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2 text-center">
            Private League Join Code
          </Text>

          <View className="flex-row items-center justify-center mb-3">
            <Text className="text-[#FFB84D] text-[28px] font-black tracking-[6px] text-center">
              {effectiveJoinCode}
            </Text>
          </View>
          <View className="flex-row justify-center">
            <TouchableOpacity
              className="bg-[#FFB84D] px-6 py-2.5 rounded-xl flex-row items-center justify-center"
              activeOpacity={0.8}
              onPress={async () => {
                const codeToShare = joinCode || league?.id || '';
                try {
                  await Share.share({
                    message: `Join my Cheer Madness Fantasy League! Use private join code: ${codeToShare}`,
                  });
                } catch {}
              }}
            >
              <Text className="text-black text-[13px] font-bold">
                Share Code
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {qrCodeUrl ? (
          <View className="flex-row items-center justify-center mb-4 bg-white p-3 rounded-2xl self-center shadow-lg">
            <Image source={{ uri: qrCodeUrl }} className="w-36 h-36" />
          </View>
        ) : null}

        <View className="bg-[#1a1a1a] border border-[#333] rounded-xl p-3 flex-row items-center justify-between">
          <Text
            className="text-[#E0B566] text-[12px] font-mono flex-1 mr-2"
            numberOfLines={1}
          >
            {joinCode ? `Join code: ${joinCode}` : 'Join code unavailable'}
          </Text>
        </View>
      </View>
    </View>
  );
};

export const TeamTab = ({
  teamSlots: propTeamSlots = [],
  isMember = false,
  onOpenJoinModal,
  maxTeams: propMaxTeams = 12,
  myRoster,
  isMyRosterLoading = false,
  totalRosterSize,
  onSelectRosterPlayer,
  onSelectTeam,
}: any) => {
  const allTeams = Array.isArray(propTeamSlots)
    ? propTeamSlots.filter((t: any) => t !== null && t !== undefined)
    : [];
  const filledCount = allTeams.length;
  const maxTeams = propMaxTeams || 12;

  const starters = myRoster?.starters || [];
  const bench = myRoster?.bench || [];
  const rosterCount = myRoster?.rosterCount ?? 0;

  return (
    <View className="mb-4 mt-2">
      {/* My fantasy team roster */}
      {isMember && (
        <View className="bg-[#111] border border-[#222] rounded-[24px] p-4 mb-6">
          <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-[#222]">
            <View className="flex-row items-center">
              <Shield color="#8B3DFF" size={20} className="mr-2.5" />
              <Text
                className="text-white text-[17px] font-bold"
                numberOfLines={1}
              >
                {myRoster?.team?.name || 'MY FANTASY TEAM'}
              </Text>
            </View>
            <View className="bg-[#1e1a2b] border border-[#8B3DFF]/50 px-3 py-1 rounded-full">
              <Text className="text-[#8B3DFF] text-[12px] font-bold">
                {`Roster: ${rosterCount} / ${totalRosterSize ?? '—'}`}
              </Text>
            </View>
          </View>

          {isMyRosterLoading && !myRoster ? (
            <RosterSkeleton />
          ) : !myRoster ? (
            <Text className="text-gray-500 text-[12px] italic">
              Your roster is unavailable right now. Pull to refresh or try again
              shortly.
            </Text>
          ) : rosterCount === 0 ? (
            <Text className="text-gray-500 text-[12px] italic">
              You have not acquired any cheer teams yet. Teams you draft or add
              appear here.
            </Text>
          ) : (
            <RosterSections
              starters={starters}
              bench={bench}
              onSelectPlayer={onSelectRosterPlayer}
            />
          )}
        </View>
      )}

      {/* Header Summary */}
      <View className="flex-row items-center justify-between mb-4 bg-[#111] p-4 rounded-2xl border border-[#222]">
        <View className="flex-row items-center">
          <Users color="#E0B566" size={20} className="mr-3" />
          <View>
            <Text className="text-white text-[15px] font-semibold">
              League Teams
            </Text>
            <Text className="text-gray-400 text-[12px]">{`${filledCount} / ${maxTeams} Teams Filled`}</Text>
          </View>
        </View>

        {!isMember && onOpenJoinModal ? (
          <TouchableOpacity
            className="bg-[#8B3DFF] px-4 py-2 rounded-full flex-row items-center"
            activeOpacity={0.8}
            onPress={onOpenJoinModal}
          >
            <Plus color="#fff" size={16} className="mr-1" />
            <Text className="text-white text-[13px] font-bold">
              Join League
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-full flex-row items-center">
            <UserCheck color="#34d399" size={14} className="mr-1.5" />
            <Text className="text-emerald-400 text-[12px] font-medium">
              Joined
            </Text>
          </View>
        )}
      </View>

      {/* Team List */}
      {allTeams.length === 0 ? (
        <View className="py-12 items-center justify-center bg-[#111] border border-[#222] rounded-2xl">
          <Users color="#555" size={32} />
          <Text className="text-gray-400 text-[14px] font-medium mt-3">
            No teams joined yet
          </Text>
          <Text className="text-gray-600 text-[12px] mt-1">
            Teams will appear here when managers join the league.
          </Text>
        </View>
      ) : (
        allTeams.map((team: any, index: number) => {
          const canOpenRoster = !!(team.teamId && onSelectTeam);
          return (
            <TouchableOpacity
              key={`team-${team.id || team.teamId || index}`}
              className="flex-row items-center justify-between border-b border-[#222] pb-4 mb-4"
              activeOpacity={canOpenRoster ? 0.7 : 1}
              disabled={!canOpenRoster}
              onPress={() => onSelectTeam(team.teamId, team.name)}
            >
              <View className="flex-row items-center flex-1">
                <View className="w-12 h-12 rounded-full border border-[#333] justify-center items-center bg-black mr-4 overflow-hidden">
                  {team.avatarUri ? (
                    <Image
                      source={{ uri: team.avatarUri }}
                      className="w-full h-full"
                    />
                  ) : (
                    <Text className="text-[#8B3DFF] text-[10px] font-bold">
                      TEAM
                    </Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text
                    className="text-white text-[15px] font-semibold mb-0.5"
                    numberOfLines={1}
                  >
                    {team.name}
                  </Text>
                  <Text className="text-[#E0B566] text-[13px]">
                    {team.handle || `@team${index + 1}`}
                  </Text>
                  {canOpenRoster && (
                    <Text className="text-gray-500 text-[11px] mt-0.5">
                      Tap to view this manager's team roster
                    </Text>
                  )}
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="bg-[#222] border border-[#333] px-3 py-1 rounded-full">
                  <Text className="text-gray-300 text-[11px] font-medium">
                    {team.role || (index === 0 ? 'Commissioner' : 'Joined')}
                  </Text>
                </View>
                {canOpenRoster && <ChevronRight color="#666" size={16} />}
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
};

export const PlayersTab = ({
  players = [],
  positions = [],
  searchTerm,
  onChangeSearchTerm,
  selectedPositionId,
  onSelectPosition,
  isLoading = false,
  isFetching = false,
  hasMore = false,
  totalItems = 0,
  onLoadMore,
  onSelectPlayer,
}: any) => {
  return (
    <View className="mb-6 mt-2">
      {/* Team search */}
      <View className="flex-row items-center bg-[#111] border border-[#262626] rounded-2xl px-3.5 py-2.5 mb-3 shadow-sm">
        <Search color="#888" size={16} />
        <TextInput
          className="flex-1 text-white text-[14px] ml-2.5 p-0"
          placeholder="Search team name, country, or division..."
          placeholderTextColor="#666"
          value={searchTerm}
          onChangeText={onChangeSearchTerm}
          autoCorrect={false}
          returnKeyType="search"
        />
        {!!searchTerm && (
          <TouchableOpacity
            onPress={() => onChangeSearchTerm('')}
            hitSlop={8}
            className="p-1"
          >
            <X color="#999" size={16} />
          </TouchableOpacity>
        )}
      </View>

      {/* Division filters */}
      {positions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
        >
          <TouchableOpacity
            className={`rounded-full px-4 py-1.5 mr-2.5 border ${
              !selectedPositionId
                ? 'border-[#FFB84D] bg-[#FFB84D]/15'
                : 'border-[#2c2c2c] bg-[#141414]'
            }`}
            onPress={() => onSelectPosition(null)}
            activeOpacity={0.7}
          >
            <Text
              className={`${
                !selectedPositionId
                  ? 'text-[#FFB84D] font-bold'
                  : 'text-gray-400 font-medium'
              } text-[12px]`}
            >
              All
            </Text>
          </TouchableOpacity>
          {positions.map((pos: any) => {
            const isSelected = String(selectedPositionId) === String(pos._id);
            return (
              <TouchableOpacity
                key={pos._id}
                className={`rounded-full px-4 py-1.5 mr-2.5 border ${
                  isSelected
                    ? 'border-[#FFB84D] bg-[#FFB84D]/15'
                    : 'border-[#2c2c2c] bg-[#141414]'
                }`}
                onPress={() => onSelectPosition(isSelected ? null : pos._id)}
                activeOpacity={0.7}
              >
                <Text
                  className={`${
                    isSelected
                      ? 'text-[#FFB84D] font-bold'
                      : 'text-gray-400 font-medium'
                  } text-[12px]`}
                >
                  {pos.code || pos.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {isLoading ? (
        <TeamListSkeleton />
      ) : players.length === 0 ? (
        <View className="py-14 items-center justify-center px-6 bg-[#111] border border-[#222] rounded-3xl my-2">
          <View className="w-12 h-12 rounded-full bg-[#1c1c1c] items-center justify-center mb-3">
            <User color="#666" size={24} />
          </View>
          <Text className="text-white text-[15px] font-bold mb-1.5 text-center">
            No cheer teams available
          </Text>
          <Text className="text-gray-400 text-[12px] text-center max-w-[260px] leading-4">
            {searchTerm || selectedPositionId
              ? 'No teams match this search. Try clearing it or choosing another division.'
              : 'Eligible real-world cheer teams appear here until a fantasy manager drafts them.'}
          </Text>
          {Boolean(searchTerm || selectedPositionId) && (
            <TouchableOpacity
              onPress={() => {
                onChangeSearchTerm('');
                onSelectPosition(null);
              }}
              className="mt-4 px-4 py-2 rounded-full bg-[#222] border border-[#333]"
            >
              <Text className="text-[#FFB84D] text-[12px] font-semibold">
                Reset Filters
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className="text-gray-400 text-[12px] font-semibold">
              {`Showing ${players.length}${
                totalItems ? ` of ${totalItems}` : ''
              } teams`}
            </Text>
            {hasMore && (
              <Text className="text-[#8B3DFF] text-[11px] font-bold">
                Scroll down to load more
              </Text>
            )}
          </View>

          {players.map((player: any, index: number) => (
            <TouchableOpacity
              key={`${player.id}-${index}`}
              className="flex-row items-center justify-between bg-[#121212] border border-[#222] p-3.5 rounded-2xl mb-3 shadow-sm active:bg-[#1a1a1a]"
              activeOpacity={0.7}
              onPress={() => onSelectPlayer && onSelectPlayer(player)}
            >
              <View className="flex-row items-center flex-1 mr-2">
                {player.avatarUri ? (
                  <Image
                    source={{ uri: player.avatarUri }}
                    className="w-12 h-12 rounded-2xl mr-3.5 bg-[#222] border border-[#333]"
                  />
                ) : (
                  <View className="w-12 h-12 rounded-2xl mr-3.5 bg-[#1c1c1c] border border-[#333] justify-center items-center">
                    <User color="#888" size={20} />
                  </View>
                )}
                <View className="flex-1">
                  <Text
                    className="text-white text-[15px] font-bold mb-0.5"
                    numberOfLines={1}
                  >
                    {player.name}
                  </Text>
                  <Text className="text-gray-400 text-[12px]">
                    {player.subtitle}
                  </Text>
                </View>
              </View>

              <View className="items-end justify-center">
                {player.value !== null && player.value !== undefined ? (
                  <View className="items-end mb-1">
                    <Text className="text-[#FFB84D] text-[14px] font-bold">{`$${player.value}`}</Text>
                    <Text className="text-gray-600 text-[9px] uppercase font-bold">
                      Value
                    </Text>
                  </View>
                ) : (
                  <View className="bg-[#8B3DFF]/15 border border-[#8B3DFF]/30 px-3 py-1 rounded-xl">
                    <Text className="text-[#8B3DFF] text-[12px] font-bold">
                      Add
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Scrolling Pagination Bottom Indicator */}
          {isFetching ? (
            <TeamListFooterSkeleton />
          ) : hasMore ? (
            <TouchableOpacity
              className="border border-[#333] bg-[#161616] rounded-2xl py-3.5 items-center mb-6 mt-1 flex-row justify-center active:bg-[#222]"
              onPress={onLoadMore}
              activeOpacity={0.7}
            >
              <Text className="text-gray-200 text-[13px] font-semibold">
                Load more teams
              </Text>
            </TouchableOpacity>
          ) : players.length > 0 ? (
            <View className="py-4 items-center justify-center">
              <View className="bg-[#141414] border border-[#222] px-4 py-1.5 rounded-full">
                <Text className="text-gray-500 text-[11px] font-medium">
                  All {totalItems || players.length} available teams loaded
                </Text>
              </View>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
};

interface LeagueTabProps {
  leagueId: string;
  userTeamId?: string | null;
  league: any;
  matchScores?: LeagueMatchScoresResponse;
  matchScoresLoading: boolean;
  matchScoresError: boolean;
  onRetryScores: () => void;
}

export const LeagueTab = ({
  leagueId,
  userTeamId,
  league,
  matchScores,
  matchScoresLoading,
  matchScoresError,
  onRetryScores,
}: LeagueTabProps) => {
  const {
    data: standingsData,
    isLoading: standingsLoading,
    isError: standingsError,
    refetch: refetchStandings,
  } = useGetLeagueStandingsQuery(leagueId, {
    skip: !leagueId || leagueId.startsWith('mock-'),
  });
  const standingsList = standingsData?.standings || [];
  const publicNames = new Map(
    (matchScores?.entries ?? []).map(entry => [entry.fantasyTeamId, entry]),
  );

  return (
    <View className="mb-4 mt-2">
      <View className="bg-[#111] border border-[#222] rounded-[24px] p-5 mb-6">
        <View className="flex-row items-center mb-4 pb-3 border-b border-[#222]">
          <Settings color="#E0B566" size={20} className="mr-3" />
          <Text className="text-white text-[16px] font-bold">
            League Overview & Rules
          </Text>
        </View>
        <View className="space-y-3">
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-gray-400 text-[13px]">League Type</Text>
            <Text className="text-[#E0B566] text-[13px] font-bold uppercase">
              {league?.visibility || 'Public'}
            </Text>
          </View>
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-gray-400 text-[13px]">Total Team Capacity</Text>
            <Text className="text-white text-[13px] font-medium">
              {league?.maxTeams || 12} Teams Max
            </Text>
          </View>
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-gray-400 text-[13px]">Draft Type</Text>
            <Text className="text-white text-[13px] font-medium capitalize">
              {`${league?.draftSettings?.type || 'Auction'} draft`}
            </Text>
          </View>
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-gray-400 text-[13px]">Scoring Format</Text>
            <Text className="text-[#8B3DFF] text-[13px] font-semibold">
              Season total points
            </Text>
          </View>
          {league?.description ? (
            <View className="mt-3 pt-3 border-t border-[#222]">
              <Text className="text-gray-400 text-[12px] font-medium mb-1">
                About League
              </Text>
              <Text className="text-gray-300 text-[13px] leading-5">
                {league.description}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="mb-8">
        <Text className="text-white text-[18px] font-bold mb-4">
          League Standings
        </Text>
        <View className="bg-[#111] border border-[#222] rounded-[20px] p-3">
          {(standingsLoading && !standingsData) || (matchScoresLoading && !matchScores) ? (
            <StandingsSkeleton />
          ) : standingsError || matchScoresError ? (
            <View className="items-center p-4">
              <Text className="text-gray-400 text-[13px] text-center mb-3">
                Unable to load league standings.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                className="bg-[#8B3DFF] px-5 py-2.5 rounded-full"
                onPress={() => {
                  if (standingsError) refetchStandings();
                  if (matchScoresError) onRetryScores();
                }}
              >
                <Text className="text-white text-[13px] font-medium">Retry</Text>
              </TouchableOpacity>
            </View>
          ) : standingsList.length > 0 && matchScores ? (
            standingsList.map((item: any) => {
              const publicEntry = publicNames.get(String(item.fantasyTeamId));
              const isMyTeam = publicEntry?.isCurrentUser ||
                String(item.fantasyTeamId) === String(userTeamId);
              return (
                <View
                  key={String(item.fantasyTeamId)}
                  accessibilityState={{ selected: isMyTeam }}
                  className={`flex-row items-center justify-between p-3 rounded-[16px] mb-2 border ${
                    isMyTeam
                      ? 'bg-[#8B3DFF]/20 border-[#8B3DFF]'
                      : 'bg-[#181818] border-[#222]'
                  }`}
                >
                  <Text className="text-[#E0B566] text-[12px] font-bold w-9">
                    #{item.rank}
                  </Text>
                  <Text
                    className={`flex-1 text-[14px] font-bold ${
                      isMyTeam ? 'text-[#E0B566]' : 'text-white'
                    }`}
                    numberOfLines={1}
                  >
                    {publicEntry?.displayName || 'Name unavailable'}
                  </Text>
                  <View className="items-end ml-3">
                    <Text className="text-gray-400 text-[10px] mb-0.5">
                      Total Points
                    </Text>
                    <Text className="text-white text-[14px] font-bold">
                      {formatTotalPoints(Number(item.pointsFor ?? 0))}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text className="text-gray-500 text-[12px] p-3 text-center">
              No standings available yet.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};
