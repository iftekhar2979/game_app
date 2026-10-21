import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X } from 'lucide-react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../../../App';
import {
  type CheerWaiverClaim,
  type CheerWaiverClaimStatus,
  type SeasonCheerTeam,
  useGetAvailableCheerTeamsQuery,
  useGetCheerWaiverClaimsQuery,
  useGetFantasyCheerRosterQuery,
  useProcessCheerWaiversMutation,
  useSubmitCheerWaiverClaimMutation,
} from '../../store/api/cheerApi';
import { useGetRosterSettingsQuery } from '../../store/api/leagueApi';
import {
  CenteredError,
  CenteredLoading,
  SeasonScreenHeader,
  SectionCard,
  errorMessage,
  useLeagueSeasonContext,
} from '../../components/LeagueDetail/SeasonScreenParts';
import { resolveDivisionOptions } from '../../components/LeagueDetail/divisionCapacity';
import { waiverClaimProblem } from '../../components/LeagueDetail/seasonRules';
import { showToast } from '../../utils/toast';

type RouteProps = RouteProp<RootStackParamList, 'LeagueWaivers'>;

const CLAIM_STATUS: Record<CheerWaiverClaimStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'text-[#E0B566]' },
  won: { label: 'Won', className: 'text-[#3ccf7a]' },
  lost: { label: 'Lost', className: 'text-gray-400' },
  cancelled: { label: 'Cancelled', className: 'text-gray-500' },
  failed: { label: 'Failed', className: 'text-[#ff8a8a]' },
};

const organizationName = (team: SeasonCheerTeam) =>
  typeof team.organizationId === 'object'
    ? team.organizationId?.shortName || team.organizationId?.name || ''
    : '';

export default function LeagueWaiversScreen() {
  const { leagueId, fantasyTeamId } = useRoute<RouteProps>().params;
  const context = useLeagueSeasonContext(leagueId);

  const claims = useGetCheerWaiverClaimsQuery(
    { leagueId, fantasyTeamId },
    { refetchOnMountOrArgChange: true },
  );
  const available = useGetAvailableCheerTeamsQuery(leagueId, {
    refetchOnMountOrArgChange: true,
  });
  const myRoster = useGetFantasyCheerRosterQuery({ leagueId, fantasyTeamId });
  const [processWaivers, { isLoading: isProcessing }] =
    useProcessCheerWaiversMutation();

  const [search, setSearch] = useState('');
  const [claimTarget, setClaimTarget] = useState<SeasonCheerTeam | null>(null);

  const pendingTeamIds = useMemo(
    () =>
      new Set(
        (claims.data ?? [])
          .filter((claim) => claim.status === 'pending')
          .map((claim) => String(claim.seasonCheerTeamId)),
      ),
    [claims.data],
  );

  const filteredTeams = useMemo(() => {
    const term = search.trim().toLowerCase();
    const teams = available.data ?? [];
    if (!term) return teams;
    return teams.filter(
      (team) =>
        team.teamName.toLowerCase().includes(term) ||
        organizationName(team).toLowerCase().includes(term),
    );
  }, [available.data, search]);

  const team = myRoster.data?.team;
  const waiversOff = context.waiverType === 'none';
  const isActive = context.leagueStatus === 'active';

  const subtitle = waiversOff
    ? 'Waivers are off in this league'
    : context.waiverType === 'faab'
      ? `FAAB balance: ${team?.faabBalance ?? 0} • clears in ${context.waiverClearingDays}d`
      : `Waiver priority: #${team?.waiverPriority ?? team?.currentRank ?? '-'} • clears in ${context.waiverClearingDays}d`;

  const refreshAll = () => {
    claims.refetch();
    available.refetch();
    myRoster.refetch();
  };

  const runProcess = async () => {
    try {
      const results = await processWaivers(leagueId).unwrap();
      const won = results.filter((row) => row.status === 'won').length;
      showToast.success(
        'Waivers processed',
        results.length
          ? `${won} claim${won === 1 ? '' : 's'} awarded, ${results.length - won} failed.`
          : 'No claims were ready to process.',
      );
    } catch (err) {
      showToast.error('Could not process waivers', errorMessage(err));
    }
  };

  if (claims.isLoading || available.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={['top']}>
        <SeasonScreenHeader title="Waivers" />
        <CenteredLoading label="Loading waivers..." />
      </SafeAreaView>
    );
  }

  if (claims.isError || available.isError) {
    return (
      <SafeAreaView className="flex-1 bg-black" edges={['top']}>
        <SeasonScreenHeader title="Waivers" />
        <CenteredError
          title="Waivers unavailable"
          error={claims.error ?? available.error}
          fallback="Waiver data could not be loaded."
          onRetry={refreshAll}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top']}>
      <SeasonScreenHeader title="Waivers" subtitle={subtitle} />
      <ScrollView
        className="flex-1 px-5 pt-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={claims.isFetching || available.isFetching}
            onRefresh={refreshAll}
            tintColor="#8B3DFF"
          />
        }
      >
        {context.isCommissioner && !waiversOff ? (
          <SectionCard label="Commissioner">
            <Text className="text-gray-400 text-[12px] mb-3">
              Award every claim whose clearing period has ended. Highest bid wins,
              then waiver priority.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={isProcessing}
              onPress={runProcess}
              className="bg-[#E0B566] py-2.5 rounded-full items-center"
            >
              {isProcessing ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text className="text-black text-[13px] font-bold">Process waivers</Text>
              )}
            </TouchableOpacity>
          </SectionCard>
        ) : null}

        <SectionCard label="My claims">
          {(claims.data ?? []).length === 0 ? (
            <Text className="text-gray-500 text-[12px]">You have no waiver claims.</Text>
          ) : (
            (claims.data ?? []).map((claim) => <ClaimRow key={claim._id} claim={claim} waiverType={context.waiverType} />)
          )}
        </SectionCard>

        {!waiversOff ? (
          <>
            <Text className="text-white text-[16px] font-bold mb-3">Available teams</Text>
            <View className="flex-row items-center bg-[#111] border border-[#222] rounded-full px-4 mb-3">
              <Search color="#666" size={16} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search teams or gyms"
                placeholderTextColor="#666"
                className="flex-1 text-white text-[14px] py-2.5 ml-2"
              />
            </View>
            {filteredTeams.length === 0 ? (
              <Text className="text-gray-500 text-[12px] text-center py-6">
                {search ? 'No teams match your search.' : 'Every eligible team is owned.'}
              </Text>
            ) : (
              filteredTeams.map((seasonTeam) => {
                const pending = pendingTeamIds.has(String(seasonTeam._id));
                return (
                  <View
                    key={seasonTeam._id}
                    className="flex-row items-center bg-[#111] border border-[#222] rounded-[16px] p-3 mb-2"
                  >
                    <View className="flex-1 mr-3">
                      <Text className="text-white text-[14px] font-semibold" numberOfLines={1}>
                        {seasonTeam.teamName}
                      </Text>
                      <Text className="text-gray-500 text-[11px]" numberOfLines={1}>
                        {[organizationName(seasonTeam), `Value ${seasonTeam.openingValue}`]
                          .filter(Boolean)
                          .join(' • ')}
                      </Text>
                    </View>
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={pending || !isActive}
                      onPress={() => setClaimTarget(seasonTeam)}
                      className={`px-4 py-2 rounded-full ${
                        pending || !isActive ? 'bg-[#222]' : 'bg-[#8B3DFF]'
                      }`}
                    >
                      <Text className="text-white text-[12px] font-semibold">
                        {pending ? 'Claimed' : 'Claim'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        ) : null}
        <View className="h-10" />
      </ScrollView>

      <ClaimSheet
        leagueId={leagueId}
        fantasyTeamId={fantasyTeamId}
        target={claimTarget}
        roster={myRoster.data}
        rosterSize={context.rosterSize}
        waiverType={context.waiverType}
        onClose={() => setClaimTarget(null)}
      />
    </SafeAreaView>
  );
}

function ClaimRow({
  claim,
  waiverType,
}: {
  claim: CheerWaiverClaim;
  waiverType: string;
}) {
  const status = CLAIM_STATUS[claim.status] ?? CLAIM_STATUS.pending;
  return (
    <View className="py-2.5 border-b border-[#1d1d1d]">
      <View className="flex-row items-center justify-between">
        <Text className="text-white text-[14px] font-semibold flex-1 mr-2" numberOfLines={1}>
          {claim.seasonCheerTeamName}
        </Text>
        <Text className={`text-[11px] font-bold uppercase ${status.className}`}>{status.label}</Text>
      </View>
      <Text className="text-gray-500 text-[11px] mt-0.5">
        {[
          waiverType === 'faab' ? `Bid ${claim.bidAmount}` : null,
          claim.dropTeamName ? `Drops ${claim.dropTeamName}` : null,
          claim.status === 'pending'
            ? `Clears ${new Date(claim.processAfter).toLocaleDateString()}`
            : null,
        ]
          .filter(Boolean)
          .join(' • ')}
      </Text>
      {claim.failureReason ? (
        <Text className="text-[#ff8a8a] text-[11px] mt-0.5">{claim.failureReason}</Text>
      ) : null}
    </View>
  );
}

function ClaimSheet({
  leagueId,
  fantasyTeamId,
  target,
  roster,
  rosterSize,
  waiverType,
  onClose,
}: {
  leagueId: string;
  fantasyTeamId: string;
  target: SeasonCheerTeam | null;
  roster: any;
  rosterSize: number;
  waiverType: 'faab' | 'waiver_priority' | 'none';
  onClose: () => void;
}) {
  const [dropOwnershipId, setDropOwnershipId] = useState<string | null>(null);
  const [divisionId, setDivisionId] = useState<string | null>(null);
  const [bid, setBid] = useState('0');
  const [submit, { isLoading }] = useSubmitCheerWaiverClaimMutation();
  const { data: rosterSettings } = useGetRosterSettingsQuery(leagueId, {
    skip: !target,
  });

  useEffect(() => {
    setDropOwnershipId(null);
    setDivisionId(null);
    setBid('0');
  }, [target?._id]);

  const rosterTeams: any[] = roster?.teams ?? [];
  // The dropped team frees its division slot, so it does not count as filled.
  const { selectable, blockedReason } = useMemo(
    () =>
      resolveDivisionOptions({
        eligibleDivisionIds: target?.eligibleDivisionIds,
        divisionRules: rosterSettings?.divisionRules,
        rosterEntries: rosterTeams.filter(
          (entry) => entry.ownershipId !== dropOwnershipId,
        ),
      }),
    [target, rosterSettings?.divisionRules, rosterTeams, dropOwnershipId],
  );

  useEffect(() => {
    if (divisionId && !selectable.some((option) => option.id === divisionId)) {
      setDivisionId(null);
    }
  }, [divisionId, selectable]);

  const bidAmount = waiverType === 'faab' ? Number(bid) : 0;
  const problem = waiverClaimProblem({
    waiverType,
    bidAmount,
    faabBalance: Number(roster?.team?.faabBalance ?? 0),
    rosterCount: rosterTeams.length,
    rosterSize,
    hasDrop: !!dropOwnershipId,
    hasDivision: !!divisionId,
  });

  const send = async () => {
    if (!target || problem || !divisionId) return;
    try {
      await submit({
        leagueId,
        fantasyTeamId,
        seasonCheerTeamId: target._id,
        assignedDivisionId: divisionId,
        dropOwnershipId: dropOwnershipId ?? undefined,
        bidAmount,
      }).unwrap();
      showToast.success('Claim submitted', `${target.teamName} is on waivers.`);
      onClose();
    } catch (err) {
      showToast.error('Could not submit the claim', errorMessage(err));
    }
  };

  return (
    <Modal visible={!!target} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable className="flex-1 bg-black/70" onPress={onClose} />
        <View className="bg-[#111] border-t border-[#333] rounded-t-[28px] px-5 pt-5 pb-8 max-h-[80%]">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-[18px] font-bold flex-1 mr-3" numberOfLines={1}>
              {`Claim ${target?.teamName ?? ''}`}
            </Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <X color="#aaa" size={22} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-2">
              {rosterTeams.length >= rosterSize ? 'Drop a team (required)' : 'Drop a team (optional)'}
            </Text>
            <View className="flex-row flex-wrap mb-4">
              {rosterTeams.map((entry) => {
                const selected = entry.ownershipId === dropOwnershipId;
                return (
                  <TouchableOpacity
                    key={entry.ownershipId}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setDropOwnershipId(selected ? null : entry.ownershipId)}
                    className={`px-3 py-2 rounded-full border mr-2 mb-2 ${
                      selected ? 'bg-[#ff6b6b]/20 border-[#ff6b6b]' : 'bg-[#181818] border-[#333]'
                    }`}
                  >
                    <Text className="text-white text-[12px]">{entry.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-2">
              Division
            </Text>
            {selectable.length === 0 ? (
              <Text className="text-gray-400 text-[12px] mb-4">
                {blockedReason ?? 'No division is open for this team.'}
              </Text>
            ) : (
              <View className="flex-row flex-wrap mb-4">
                {selectable.map((option) => {
                  const selected = option.id === divisionId;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setDivisionId(option.id)}
                      className={`px-3 py-2 rounded-full border mr-2 mb-2 ${
                        selected ? 'bg-[#8B3DFF] border-[#8B3DFF]' : 'bg-[#181818] border-[#333]'
                      }`}
                    >
                      <Text className="text-white text-[12px]">
                        {`${option.name} (${option.remaining} open)`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {waiverType === 'faab' ? (
              <>
                <Text className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-2">
                  {`Bid (balance ${roster?.team?.faabBalance ?? 0})`}
                </Text>
                <TextInput
                  value={bid}
                  onChangeText={(text) => setBid(text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  className="bg-[#181818] border border-[#333] rounded-[14px] text-white text-[15px] px-4 py-3 mb-4"
                />
              </>
            ) : null}
          </ScrollView>

          {problem ? (
            <Text className="text-gray-400 text-[12px] text-center mb-2">{problem}</Text>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            disabled={!!problem || isLoading}
            onPress={send}
            className={`py-3.5 rounded-full items-center ${
              problem || isLoading ? 'bg-[#8B3DFF]/40' : 'bg-[#8B3DFF]'
            }`}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white text-[15px] font-bold">Submit claim</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
