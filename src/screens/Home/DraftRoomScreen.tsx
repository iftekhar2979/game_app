import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Users } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { setActiveTeam } from '../../store/slices/leagueSlice';
import { leagueApi } from '../../store/api/leagueApi';
import { cheerApi } from '../../store/api/cheerApi';
import {
  useGetLeagueDetailsQuery,
  useGetLeagueMembersQuery,
  useGetLeagueRostersQuery,
  useJoinLeagueMutation,
  useGetDraftStateQuery,
  useStartDraftMutation,
  useGetDraftPicksQuery,
  useGetRosterSettingsQuery,
} from '../../store/api/leagueApi';
import {
  useDraftCheerTeamMutation,
  useGetAvailableCheerTeamsQuery,
  useGetCheerAuctionQuery,
  useStartCheerAuctionMutation,
  useNominateCheerTeamMutation,
  useBidOnCheerTeamMutation,
  useFinalizeCheerAuctionTurnMutation,
  useCompleteCheerAuctionMutation,
} from '../../store/api/cheerApi';
import {
  getSocket,
  joinLeagueRoom,
  leaveLeagueRoom,
  onSocketResync,
} from '../../services/socketService';
import { showToast } from '../../utils/toast';
import {
  DraftBoard,
  DraftPickFeed,
  MyDraftedStrip,
} from '../../components/LeagueDetail/DraftBoard';
import { CHEER_DIVISIONS } from '../../utils/cheerScoring';

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'DraftRoom'
>;
type RouteProps = RouteProp<RootStackParamList, 'DraftRoom'>;

const MOCK_USERS = [
  { id: '1', name: 'Okafor', avatarUri: 'https://i.pravatar.cc/150?img=1' },
  { id: '2', name: 'Walter', avatarUri: 'https://i.pravatar.cc/150?img=2' },
  { id: '3', name: 'Noah', avatarUri: 'https://i.pravatar.cc/150?img=3' },
  { id: '4', name: 'Leonardo', avatarUri: 'https://i.pravatar.cc/150?img=4' },
];

export default function DraftRoomScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const leagueId = route.params?.leagueId;
  const isMockId = !leagueId || leagueId.startsWith('mock-');

  const league = useSelector((state: RootState) =>
    state.league.leagues.find(l => l.id === leagueId),
  );
  const reduxActiveTeamId = useSelector(
    (state: RootState) => state.league.activeTeams?.[leagueId]?.teamId,
  );

  const currentUserId = useSelector(
    (state: RootState) =>
      (state.auth?.user as any)?._id ||
      (state.auth?.user as any)?.id ||
      (state.auth?.user as any)?.sub ||
      (state.auth?.user as any)?.userId,
  );
  const [draftCheerTeam, { isLoading: isDrafting }] =
    useDraftCheerTeamMutation();
  /** The row awaiting a server response, so only that card shows a spinner. */
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);
  // No polling. The socket carries the board, and the only gap it cannot cover
  // is a dropped connection - which is handled once on reconnect below, rather
  // than by every manager re-asking on a timer for the whole draft.
  const { data: draftState, refetch: refetchDraftState } =
    useGetDraftStateQuery(leagueId, {
      skip: isMockId,
    });
  const [startDraft, { isLoading: isStartingDraft }] = useStartDraftMutation();
  const { data: draftPicks, refetch: refetchDraftPicks } =
    useGetDraftPicksQuery(leagueId, {
      skip: isMockId,
    });
  const [joinLeagueMutation] = useJoinLeagueMutation();

  const { data: apiLeagueData } = useGetLeagueDetailsQuery(leagueId, {
    skip: isMockId,
  });
  const { data: rosterSettings } = useGetRosterSettingsQuery(leagueId, {
    skip: isMockId,
  });
  const draftType =
    (apiLeagueData as any)?.draftSettings?.type ||
    (apiLeagueData as any)?.league?.draftSettings?.type ||
    (league as any)?.draftType ||
    (league as any)?.draftSettings?.type;
  const isAuctionDraft = draftType === 'auction';
  const { data: auctionState, refetch: refetchAuction } =
    useGetCheerAuctionQuery(leagueId, {
      skip: isMockId || !isAuctionDraft,
    });
  const [startAuction, { isLoading: isStartingAuction }] =
    useStartCheerAuctionMutation();
  const [nominateCheerTeam, { isLoading: isNominating }] =
    useNominateCheerTeamMutation();
  const [bidOnCheerTeam, { isLoading: isBidding }] =
    useBidOnCheerTeamMutation();
  const [finalizeAuctionTurn, { isLoading: isFinalizingAuction }] =
    useFinalizeCheerAuctionTurnMutation();
  const [completeAuction, { isLoading: isCompletingAuction }] =
    useCompleteCheerAuctionMutation();
  const [bidAmount, setBidAmount] = useState('');

  const { data: apiMembersData, isLoading: isLoadingMembers } =
    useGetLeagueMembersQuery(leagueId, {
      skip: isMockId,
    });
  const { data: apiRostersData } = useGetLeagueRostersQuery(leagueId, {
    skip: isMockId,
  });
  const {
    data: availableCheerTeams = [],
    isLoading: isLoadingAthletes,
    refetch: refetchAvailableAthletes,
  } = useGetAvailableCheerTeamsQuery(leagueId, { skip: isMockId });

  const callerInfo = (apiLeagueData as any)?.caller;

  const rosterTeam = useMemo(() => {
    const rawRosters = Array.isArray(apiRostersData)
      ? apiRostersData
      : Array.isArray((apiRostersData as any)?.data)
      ? (apiRostersData as any).data
      : [];
    if (rawRosters.length === 0) return null;
    if (currentUserId) {
      const match = rawRosters.find((r: any) => {
        const ownerId =
          r.ownerId ||
          r.ownerUserId ||
          r.userId?._id ||
          r.userId?.id ||
          r.userId;
        return String(ownerId) === String(currentUserId);
      });
      if (match) return match;
    }
    return null;
  }, [apiRostersData, currentUserId]);

  const userTeamObj = useMemo(() => {
    const memberList = Array.isArray(apiMembersData)
      ? apiMembersData
      : Array.isArray(apiMembersData?.data)
      ? apiMembersData.data
      : [];
    return memberList.find((m: any) => {
      const uId =
        m.userId?._id ||
        m.userId?.id ||
        (typeof m.userId === 'string' ? m.userId : null) ||
        m.user?._id ||
        m.user?.id ||
        m.team?.ownerId ||
        m.team?.ownerUserId;
      return String(uId) === String(currentUserId);
    });
  }, [apiMembersData, currentUserId]);

  // Authoritative sources first, cache last. caller.team is resolved by ownerId
  // on the server, so it is the id the draft compares turns against; the Redux
  // value only covers the window before those queries land.
  //
  // A membership _id is never used here. It is a different entity from the
  // fantasy team, so it can never equal draftState.currentTeam.fantasyTeamId -
  // caching one used to leave the manager permanently stuck on "Not your turn".
  const resolvedTeamId =
    callerInfo?.team?._id ||
    callerInfo?.team?.id ||
    rosterTeam?._id ||
    rosterTeam?.id ||
    userTeamObj?.team?._id ||
    userTeamObj?.team?.id ||
    null;
  const userTeamId = resolvedTeamId || reduxActiveTeamId;

  // Only a resolved fantasy team id is worth caching.
  useEffect(() => {
    if (leagueId && resolvedTeamId && resolvedTeamId !== reduxActiveTeamId) {
      dispatch(setActiveTeam({ leagueId, teamId: String(resolvedTeamId) }));
    }
  }, [leagueId, resolvedTeamId, reduxActiveTeamId, dispatch]);

  // Real-time playerAcquired socket listener
  useEffect(() => {
    if (!leagueId || isMockId) return;
    try {
      const socket = getSocket();
      joinLeagueRoom(leagueId);

      const handlePlayerAcquired = (data: any) => {
        if (data && String(data.leagueId) === String(leagueId)) {
          if (refetchAvailableAthletes) refetchAvailableAthletes();
        }
      };

      // The event already carries everything the board needs, so it is applied
      // to the cache rather than used as a doorbell to re-request it. Every
      // manager in the room used to fire three requests per pick, and the
      // draft state in that payload is byte-for-byte what GET /draft returns.
      const handleDraftUpdated = (data: any) => {
        if (!data || String(data.leagueId) !== String(leagueId)) return;

        if (data.draft) {
          dispatch(
            leagueApi.util.upsertQueryData(
              'getDraftState',
              leagueId,
              data.draft,
            ),
          );
        } else if (refetchDraftState) {
          refetchDraftState();
        }

        // Dropping the drafted team from the cached pool beats refetching the
        // whole populated list to remove one row - it is the heaviest request
        // on this screen.
        const takenTeamId = data.pick?.seasonCheerTeamId;
        if (takenTeamId) {
          dispatch(
            cheerApi.util.updateQueryData(
              'getAvailableCheerTeams',
              leagueId,
              teams =>
                teams.filter(
                  team => String(team._id) !== String(takenTeamId),
                ),
            ),
          );
        } else if (refetchAvailableAthletes) {
          refetchAvailableAthletes();
        }

        // A pick carrying everything the cards render can be appended
        // directly. Anything less and we ask the server, so an older build or
        // a failed lookup still fills the board rather than showing a gap.
        const pick = data.pick;
        const canAppendPick =
          pick &&
          typeof pick.pickNumber === 'number' &&
          typeof pick.round === 'number' &&
          (pick.cheerTeamName || pick.playerName);

        if (canAppendPick) {
          dispatch(
            leagueApi.util.updateQueryData(
              'getDraftPicks',
              leagueId,
              picks => {
                // The drafter already refetched, and a reconnect can replay an
                // event, so the pick number decides identity rather than order.
                if (picks.some(row => row.pickNumber === pick.pickNumber)) {
                  return picks;
                }
                return [...picks, pick].sort(
                  (a, b) => a.pickNumber - b.pickNumber,
                );
              },
            ),
          );
        } else if (refetchDraftPicks) {
          refetchDraftPicks();
        }
      };

      // Anything broadcast while this client was offline is gone for good, so
      // the board is re-read once on the way back rather than polled for.
      const stopResync = onSocketResync(() => {
        if (refetchDraftState) refetchDraftState();
        if (refetchDraftPicks) refetchDraftPicks();
        if (refetchAvailableAthletes) refetchAvailableAthletes();
      });

      socket.on('playerAcquired', handlePlayerAcquired);
      socket.on('draftUpdated', handleDraftUpdated);
      return () => {
        stopResync();
        socket.off('playerAcquired', handlePlayerAcquired);
        socket.off('draftUpdated', handleDraftUpdated);
        leaveLeagueRoom(leagueId);
      };
    } catch (e) {
      console.warn('DraftRoom socket error:', e);
    }
  }, [
    leagueId,
    isMockId,
    dispatch,
    refetchAvailableAthletes,
    refetchDraftState,
    refetchDraftPicks,
  ]);

  // Every value below is read from the server. No snake maths on the client.
  const isSnakeDraft = !isAuctionDraft && draftState?.isTurnOrdered === true;
  const isDraftRunning = draftState?.status === 'active';
  const isMyTurn =
    !isSnakeDraft ||
    (isDraftRunning &&
      !!userTeamId &&
      String(draftState?.currentTeam?.fantasyTeamId) === String(userTeamId));

  // Local ticking clock for the pick countdown. The deadline itself comes from
  // the server; only the "how long left" reading is computed here.
  const pickEndsAt = draftState?.currentPickEndsAt;
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    if (!isDraftRunning || !pickEndsAt) return;
    setNowTs(Date.now());
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isDraftRunning, pickEndsAt]);

  const secondsRemaining = useMemo(() => {
    if (!pickEndsAt) return null;
    const remaining = new Date(pickEndsAt).getTime() - nowTs;
    return Number.isFinite(remaining) ? Math.max(0, Math.ceil(remaining / 1000)) : null;
  }, [pickEndsAt, nowTs]);

  const formattedCountdown =
    secondsRemaining === null
      ? null
      : `${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, '0')}`;

  const handleStartDraft = async () => {
    try {
      await startDraft(leagueId).unwrap();
      showToast.success('Draft started', 'The pick order has been generated.');
    } catch (err: any) {
      showToast.error(
        'Could not start draft',
        err?.data?.message || err?.message,
      );
    }
  };

  const auctionTurn = auctionState?.currentTurn;
  const auctionIsActive = auctionState?.status === 'active';
  const minimumAuctionBid = auctionTurn
    ? Number(auctionTurn.currentBid || 0) +
      Number((apiLeagueData as any)?.draftSettings?.bidIncrement || 1)
    : Number((apiLeagueData as any)?.draftSettings?.minimumBid || 1);

  const handleAuctionStart = async () => {
    try {
      await startAuction(leagueId).unwrap();
      await refetchAuction();
      showToast.success(
        'Auction started',
        'The first manager may nominate a cheer team.',
      );
    } catch (err: any) {
      showToast.error(
        'Could not start auction',
        err?.data?.message || err?.message,
      );
    }
  };

  const handleAuctionNomination = async (player: any, assignedDivisionId: string) => {
    if (!auctionIsActive) {
      showToast.error(
        'Auction not open',
        'The commissioner must start the auction first.',
      );
      return;
    }
    if (auctionTurn) {
      showToast.error(
        'Bidding in progress',
        'Finish the current nomination before selecting another team.',
      );
      return;
    }
    try {
      await nominateCheerTeam({
        leagueId,
        seasonCheerTeamId: String(player.seasonCheerTeamId || player.id),
        assignedDivisionId,
        openingBid: minimumAuctionBid,
      }).unwrap();
      setSetPlayerModalVisible(false);
      await refetchAuction();
      showToast.success(
        'Team nominated',
        `Bidding is open for ${player.name}.`,
      );
    } catch (err: any) {
      showToast.error('Nomination failed', err?.data?.message || err?.message);
    }
  };

  const handleAuctionBid = async () => {
    const amount = Number(bidAmount || minimumAuctionBid);
    if (!auctionTurn?._id || !Number.isFinite(amount)) return;
    try {
      await bidOnCheerTeam({
        leagueId,
        turnId: String(auctionTurn._id),
        requestId: `mobile:${userTeamId}:${Date.now()}`,
        amount,
      }).unwrap();
      setBidAmount('');
      await refetchAuction();
      showToast.success(
        'Bid accepted',
        `Your bid of ${amount} is now leading.`,
      );
    } catch (err: any) {
      showToast.error('Bid failed', err?.data?.message || err?.message);
    }
  };

  const teamsList = useMemo(() => {
    const memberList = Array.isArray(apiMembersData)
      ? apiMembersData
      : Array.isArray(apiMembersData?.data)
      ? apiMembersData.data
      : [];

    if (memberList.length > 0) {
      return memberList.map((m: any, idx: number) => {
        const teamObj = m.team || {};
        const userObj =
          m.user || (typeof m.userId === 'object' ? m.userId : {});
        const teamName =
          teamObj.name ||
          m.fantasyTeamName ||
          userObj.fullName ||
          userObj.username ||
          m.name ||
          `Team ${idx + 1}`;
        const avatarUri =
          teamObj.avatarUri ||
          teamObj.logoUrl ||
          userObj.avatarUrl ||
          m.avatarUri ||
          `https://i.pravatar.cc/150?img=${(idx % 12) + 1}`;

        return {
          id: m._id || m.id || `member-${idx}`,
          name: teamName,
          avatarUri,
        };
      });
    }

    return MOCK_USERS;
  }, [apiMembersData]);

  const playersList = useMemo(() => {
    const rawList = availableCheerTeams || [];

    return rawList.map((item: any, idx: number) => {
      const organization =
        typeof item.organizationId === 'object' ? item.organizationId : {};
      const name = item.teamName || 'Unknown Cheer Team';

      const divisionLabels = (item.eligibleDivisionIds || [])
        .map((division: any) => {
          if (typeof division === 'object') {
            return division.name || division.code || '';
          }
          return (
            CHEER_DIVISIONS.find(
              option => option.id === division || option.code === division,
            )?.name || ''
          );
        })
        .filter(Boolean);
      const eligibleDivisions = (item.eligibleDivisionIds || []).map((division: any) => {
        const fallback = CHEER_DIVISIONS.find(
          option => option.id === division || option.code === division,
        );
        return {
          id: String(
            typeof division === 'object'
              ? division._id || division.id
              : division,
          ),
          code:
            (typeof division === 'object' ? division.code : fallback?.code) || '',
          name:
            (typeof division === 'object'
              ? division.name || division.code
              : fallback?.name) || 'Cheer division',
        };
      });
      const country =
        organization.country ||
        item.country ||
        organization.location ||
        'Country unavailable';

      return {
        id: item._id || item.id || `p-${idx}`,
        seasonCheerTeamId: item._id,
        name,
        country,
        divisionLabels,
        eligibleDivisions,
        subtitle: [
          country,
          divisionLabels.join(' / ') || 'Division unavailable',
        ]
          .filter(Boolean)
          .join(' • '),
        value: item.openingValue ?? null,
        avatarUri: organization.logoUrl || null,
      };
    });
  }, [availableCheerTeams]);

  const [setPlayerModalVisible, setSetPlayerModalVisible] = useState(false);
  /** Auction nomination only; snake picks let the server choose the division. */
  const [pendingAssignment, setPendingAssignment] = useState<{
    player: any;
    divisions: Array<{ id: string; code: string; name: string }>;
  } | null>(null);
  const [isDraftStarted, setIsDraftStarted] = useState(false);

  /**
   * Divisions this team could occupy given the league roster template. Only a
   * pre-flight check now: it turns "your roster has no slot for this team" into
   * an immediate message instead of a round trip that fails.
   */
  const rosterDivisionsFor = (player: any) => {
    const allowedCodes = new Set(
      (rosterSettings?.divisionRules || []).map(rule =>
        rule.divisionCode.toUpperCase(),
      ),
    );
    return (player.eligibleDivisions || []).filter(
      (division: any) =>
        division.id && allowedCodes.has(String(division.code).toUpperCase()),
    );
  };

  /** Auction nominations still name the division - it is fixed on the turn. */
  const openDivisionPicker = (player: any) => {
    const divisions = rosterDivisionsFor(player);
    if (!divisions.length) {
      showToast.error(
        'No valid roster division',
        'This Cheer Team is not eligible for an available slot division in the League roster template.',
      );
      return;
    }
    setPendingAssignment({ player, divisions });
  };

  const confirmDivisionAssignment = async (assignedDivisionId: string) => {
    const pending = pendingAssignment;
    if (!pending) return;
    setPendingAssignment(null);
    await handleAuctionNomination(pending.player, assignedDivisionId);
  };

  /**
   * Reports a draft outcome once the team picker is closed.
   *
   * Toasts render in their own Modal, and React Native does not reliably
   * present one Modal over another - the toast flashes and disappears instead
   * of holding. Both outcomes close the picker first, which also means a failed
   * pick reopens against a freshly broadcast pool rather than a stale list.
   */
  const reportDraftOutcome = (report: () => void) => {
    setSetPlayerModalVisible(false);
    requestAnimationFrame(report);
  };

  const draftSelectedTeam = async (player: any) => {
    setPendingTeamId(String(player.id));
    try {
      // No division is sent: the server assigns the one that keeps the rest of
      // the roster fillable, and tells us which it chose.
      const result: any = await draftCheerTeam({
        leagueId,
        seasonCheerTeamId: String(player.seasonCheerTeamId || player.id),
      }).unwrap();
      const divisionName =
        result?.division?.name || result?.division?.code || null;
      reportDraftOutcome(() =>
        showToast.success(
          'Draft Pick Success!',
          divisionName
            ? `${player.name} was drafted to your ${divisionName} slot.`
            : `${player.name} was drafted to your team.`,
        ),
      );
      // The pool is corrected by the draftUpdated broadcast, so no refetch.
    } catch (err: any) {
      reportDraftOutcome(() =>
        showToast.error(
          'Draft Error',
          err?.data?.message || err?.message || 'Failed to draft cheer team.',
        ),
      );
    } finally {
      setPendingTeamId(null);
    }
  };

  const confirmDraft = (player: any) => {
    if (!rosterDivisionsFor(player).length) {
      showToast.error(
        'No valid roster division',
        'This Cheer Team is not eligible for an available slot division in the League roster template.',
      );
      return;
    }
    Alert.alert(
      'Draft this team?',
      `${player.name} will be added to your fantasy roster.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Draft', onPress: () => draftSelectedTeam(player) },
      ],
    );
  };

  useEffect(() => {
    if (!league?.draftDate || !league?.draftTime) return;

    const dDate = new Date(league.draftDate);
    const tTime = new Date(league.draftTime);
    dDate.setHours(tTime.getHours(), tTime.getMinutes(), 0, 0);
    const targetTime = dDate.getTime();

    const checkTime = () => {
      if (Date.now() >= targetTime) {
        setIsDraftStarted(true);
      } else {
        setIsDraftStarted(false);
      }
    };

    checkTime();
    const intervalId = setInterval(checkTime, 1000);

    return () => clearInterval(intervalId);
  }, [league?.draftDate, league?.draftTime]);

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
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
          <Text className="text-white text-[20px] font-bold">Draft Room</Text>
          <Text className="text-gray-400 text-[12px]">
            {league?.name ? `${league.name} • ` : ''}
            {isDraftStarted
              ? 'Draft Open'
              : league?.draftDate && league?.draftTime
              ? `Scheduled: ${new Date(
                  league.draftDate,
                ).toLocaleDateString()} ${new Date(
                  league.draftTime,
                ).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'Draft Room Open'}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {isAuctionDraft && (
          <View className="mx-5 mt-4 bg-[#111] border border-[#222] rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-white text-[15px] font-bold">
                Cheer Team Auction
              </Text>
              <Text className="text-[#8B3DFF] text-[10px] font-bold uppercase">
                {auctionState?.status || 'scheduled'}
              </Text>
            </View>
            {!auctionIsActive ? (
              <TouchableOpacity
                className="bg-[#8B3DFF] rounded-full py-3 items-center"
                disabled={isStartingAuction}
                onPress={handleAuctionStart}
              >
                {isStartingAuction ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-[14px] font-bold">
                    Start auction
                  </Text>
                )}
              </TouchableOpacity>
            ) : auctionTurn ? (
              <View>
                <Text className="text-gray-400 text-[10px] uppercase font-bold">
                  Now bidding
                </Text>
                <Text className="text-white text-[17px] font-bold mt-1">
                  {auctionTurn?.seasonCheerTeamId?.teamName || 'Cheer Team'}
                </Text>
                <Text className="text-[#E0B566] text-[13px] mt-1">
                  Current bid: {auctionTurn.currentBid}
                </Text>
                <Text className="text-gray-500 text-[11px] mt-1">
                  Ends{' '}
                  {new Date(auctionTurn.biddingEndsAt).toLocaleTimeString()}
                </Text>
                <View className="flex-row mt-3">
                  <TextInput
                    className="flex-1 h-11 rounded-xl border border-[#333] bg-black px-3 text-white mr-2"
                    keyboardType="number-pad"
                    placeholder={`Min ${minimumAuctionBid}`}
                    placeholderTextColor="#666"
                    value={bidAmount}
                    onChangeText={setBidAmount}
                  />
                  <TouchableOpacity
                    className="bg-[#8B3DFF] px-5 rounded-xl justify-center"
                    disabled={isBidding}
                    onPress={handleAuctionBid}
                  >
                    {isBidding ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text className="text-white font-bold">Bid</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  className="border border-[#444] rounded-xl py-2.5 items-center mt-3"
                  disabled={isFinalizingAuction}
                  onPress={async () => {
                    try {
                      await finalizeAuctionTurn({
                        leagueId,
                        turnId: String(auctionTurn._id),
                      }).unwrap();
                      await Promise.all([
                        refetchAuction(),
                        refetchAvailableAthletes(),
                      ]);
                    } catch (err: any) {
                      showToast.error(
                        'Cannot finalize yet',
                        err?.data?.message || err?.message,
                      );
                    }
                  }}
                >
                  <Text className="text-gray-300 text-[12px] font-semibold">
                    Finalize after timer
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text className="text-gray-400 text-[12px] mb-3">
                  The manager on nomination duty should select an available
                  cheer team below.
                </Text>
                <TouchableOpacity
                  className="border border-[#444] rounded-xl py-2.5 items-center"
                  disabled={isCompletingAuction}
                  onPress={async () => {
                    try {
                      await completeAuction(leagueId).unwrap();
                      showToast.success(
                        'Auction complete',
                        'All rosters are filled and league play is active.',
                      );
                    } catch (err: any) {
                      showToast.error(
                        'Auction still open',
                        err?.data?.message || err?.message,
                      );
                    }
                  }}
                >
                  <Text className="text-gray-300 text-[12px] font-semibold">
                    Complete filled auction
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Server-driven draft status */}
        {isSnakeDraft && (
          <View className="mx-5 mt-4 bg-[#111] border border-[#222] rounded-2xl p-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-white text-[15px] font-bold capitalize">
                {`${draftState?.type} draft`}
              </Text>
              <View className="bg-[#1e1a2b] border border-[#8B3DFF]/50 px-2.5 py-0.5 rounded-full">
                <Text className="text-[#8B3DFF] text-[10px] font-bold uppercase">
                  {draftState?.status}
                </Text>
              </View>
            </View>

            {isDraftRunning ? (
              <>
                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-400 text-[12px] flex-1 mr-2">
                    {`Round ${draftState?.currentRound} of ${draftState?.totalRounds} • Pick ${draftState?.currentPick} of ${draftState?.totalPicks}`}
                  </Text>
                  {formattedCountdown ? (
                    <View
                      className={`px-2.5 py-1 rounded-full border ${
                        secondsRemaining === 0
                          ? 'bg-[#2b1f1f] border-[#7a3b3b]'
                          : secondsRemaining !== null && secondsRemaining <= 10
                          ? 'bg-[#2b241a] border-[#E0B566]'
                          : 'bg-[#1a1a1a] border-[#333]'
                      }`}
                    >
                      <Text
                        className={`text-[12px] font-bold ${
                          secondsRemaining === 0
                            ? 'text-red-300'
                            : secondsRemaining !== null && secondsRemaining <= 10
                            ? 'text-[#E0B566]'
                            : 'text-gray-300'
                        }`}
                      >
                        {secondsRemaining === 0
                          ? 'Time up'
                          : `${formattedCountdown} left`}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {secondsRemaining === 0 ? (
                  <Text className="text-gray-500 text-[11px] mt-1.5">
                    The clock has run out, but picks are still accepted.
                  </Text>
                ) : null}
                <View className="flex-row items-center mt-2.5 pt-2.5 border-t border-[#222]">
                  <View className="flex-1">
                    <Text className="text-gray-500 text-[10px] uppercase font-bold">
                      On the clock
                    </Text>
                    <Text
                      className="text-white text-[15px] font-semibold"
                      numberOfLines={1}
                    >
                      {draftState?.currentTeam?.name || 'TBD'}
                    </Text>
                  </View>
                  {!!draftState?.nextTeam && (
                    <View className="flex-1">
                      <Text className="text-gray-500 text-[10px] uppercase font-bold">
                        Next
                      </Text>
                      <Text
                        className="text-gray-300 text-[13px]"
                        numberOfLines={1}
                      >
                        {draftState.nextTeam.name}
                      </Text>
                    </View>
                  )}
                </View>
                {!isMyTurn && (
                  <Text className="text-amber-400 text-[11px] mt-2.5">
                    Waiting for another team to pick.
                  </Text>
                )}
              </>
            ) : draftState?.status === 'completed' ? (
              <Text className="text-gray-400 text-[12px]">
                This draft has finished.
              </Text>
            ) : (
              <>
                <Text className="text-gray-400 text-[12px] mb-3">
                  The pick order is generated when the draft starts.
                </Text>
                <TouchableOpacity
                  className={`bg-[#8B3DFF] rounded-full py-3 items-center ${
                    isStartingDraft ? 'opacity-50' : ''
                  }`}
                  disabled={isStartingDraft}
                  onPress={handleStartDraft}
                  activeOpacity={0.8}
                >
                  {isStartingDraft ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white text-[14px] font-semibold">
                      Start draft
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Board, own picks and feed — all from server-resolved data */}
        {isSnakeDraft && draftState && draftState.order.length > 0 && (
          <View className="mt-5">
            <DraftBoard
              draft={draftState}
              picks={draftPicks}
              myTeamId={userTeamId}
            />
            <MyDraftedStrip picks={draftPicks} myTeamId={userTeamId} />
            <DraftPickFeed picks={draftPicks} />
          </View>
        )}

        {/* Top Teams Header */}
        <View className="my-4">
          <Text className="text-gray-400 text-[12px] px-5 mb-2 font-medium">
            League Managers ({teamsList.length})
          </Text>
          {isLoadingMembers ? (
            <ActivityIndicator
              color="#8B3DFF"
              size="small"
              style={{ marginVertical: 10 }}
            />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {teamsList.map((user: any) => {
                const isUserTeam =
                  String(user.id) === String(userTeamId) ||
                  String(user.id) === String(userTeamObj?._id);
                return (
                  <View key={user.id} className="items-center mr-5 w-16">
                    <View
                      className={`rounded-full p-0.5 ${
                        isUserTeam ? 'border-2 border-[#8B3DFF]' : ''
                      }`}
                    >
                      <Image
                        source={{ uri: user.avatarUri }}
                        className="w-10 h-10 rounded-full bg-[#222] border border-[#333]"
                        resizeMode="cover"
                      />
                    </View>
                    <Text
                      className={`text-[11px] text-center font-medium mt-1 ${
                        isUserTeam
                          ? 'text-[#8B3DFF] font-bold'
                          : 'text-gray-300'
                      }`}
                      numberOfLines={1}
                    >
                      {user.name}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Draft Action Banner */}
        <View className="px-5 mb-5">
          <TouchableOpacity
            className="w-full bg-[#8B3DFF] h-[52px] rounded-2xl flex-row justify-center items-center shadow-lg"
            onPress={() => setSetPlayerModalVisible(true)}
            disabled={isDrafting || isLoadingAthletes}
            activeOpacity={0.8}
          >
            {isDrafting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Users color="#fff" size={20} className="mr-2" />
                <Text className="text-white text-[15px] font-bold">
                  {isAuctionDraft ? 'Nominate Cheer Team' : 'Draft Cheer Team'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Available real-world team pool */}
        <View className="px-5 pb-10">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-[18px] font-bold">
              Available Cheer Teams
            </Text>
            <Text className="text-gray-400 text-[12px]">
              {playersList.length} Available
            </Text>
          </View>

          {/* Cheer team list */}
          {isLoadingAthletes ? (
            <ActivityIndicator
              color="#8B3DFF"
              size="large"
              style={{ marginVertical: 30 }}
            />
          ) : playersList.length === 0 ? (
            <View className="py-10 items-center justify-center px-4">
              <Text className="text-white text-[14px] font-semibold mb-1.5">
                No cheer teams available
              </Text>
              <Text className="text-gray-400 text-[12px] text-center">
                Eligible real-world cheer teams appear here until another
                fantasy manager drafts them.
              </Text>
            </View>
          ) : (
            playersList.map((player: any, idx: number) => (
              <TouchableOpacity
                key={`${player.id}-${idx}`}
                className="flex-row items-center justify-between bg-[#141414] border border-[#262626] p-3.5 rounded-2xl mb-3"
                activeOpacity={0.8}
                disabled={isDrafting}
                onPress={async () => {
                  if (isAuctionDraft) {
                    openDivisionPicker(player);
                    return;
                  }

                  if (isSnakeDraft && !isDraftRunning) {
                    showToast.error(
                      'Draft not open',
                      'The draft has not started yet.',
                    );
                    return;
                  }
                  if (isSnakeDraft && !isMyTurn) {
                    showToast.error(
                      'Not your turn',
                      `${
                        draftState?.currentTeam?.name || 'Another team'
                      } is on the clock.`,
                    );
                    return;
                  }
                  if (!leagueId || !userTeamId) {
                    Alert.alert(
                      'Not Joined Yet',
                      'You must join this league to draft cheer teams.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Join League Now',
                          onPress: async () => {
                            try {
                              const defaultName = `Team ${
                                ((apiMembersData as any)?.length || 0) + 1
                              }`;
                              const joined: any = await joinLeagueMutation({
                                id: leagueId,
                                fantasyTeamName: defaultName,
                              }).unwrap();
                              const newTeamId =
                                joined?.team?._id ||
                                joined?.team?.id ||
                                joined?._id;
                              if (newTeamId) {
                                dispatch(
                                  setActiveTeam({
                                    leagueId,
                                    teamId: String(newTeamId),
                                  }),
                                );
                                showToast.success(
                                  'Joined Successfully!',
                                  `Joined as "${defaultName}". Please tap Draft again.`,
                                );
                              }
                            } catch (e: any) {
                              showToast.error(
                                'Join Error',
                                e?.data?.message || 'Failed to join league.',
                              );
                            }
                          },
                        },
                      ],
                    );
                    return;
                  }
                  confirmDraft(player);
                }}
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <Image
                    source={{ uri: player.avatarUri }}
                    className="w-11 h-11 rounded-full bg-[#222] border border-[#333] mr-3"
                  />
                  <View className="flex-1">
                    <Text
                      className="text-white text-[15px] font-semibold mb-0.5"
                      numberOfLines={1}
                    >
                      {player.name}
                    </Text>
                    <Text className="text-gray-400 text-[12px]">
                      {player.subtitle}
                    </Text>
                  </View>
                </View>
                <View className="bg-[#8B3DFF]/20 px-3 py-1.5 rounded-xl border border-[#8B3DFF]/40 min-w-[74px] items-center">
                  {pendingTeamId === String(player.id) ? (
                    <ActivityIndicator size="small" color="#8B3DFF" />
                  ) : (
                    <Text className="text-[#8B3DFF] text-[13px] font-bold">
                      {isAuctionDraft ? 'Nominate' : 'Draft'}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Select cheer team modal */}
      <Modal
        visible={setPlayerModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSetPlayerModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/80">
          <View className="w-full h-[80%] bg-[#1a1a1a] border-t border-[#333] rounded-t-[32px] p-6">
            {/* Modal Header */}
            <View className="flex-row items-center justify-between mb-5 pb-4 border-b border-[#333]">
              <Text className="text-white text-[20px] font-bold">
                Select Cheer Team
              </Text>
              <TouchableOpacity
                className="px-3 py-1.5 rounded-full bg-[#2b2b2b]"
                onPress={() => setSetPlayerModalVisible(false)}
              >
                <Text className="text-gray-300 text-xs font-semibold">
                  Close
                </Text>
              </TouchableOpacity>
            </View>

            {/* Cheer team list */}
            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
              {playersList.length === 0 && (
                <View className="py-10 items-center justify-center px-4">
                  <Text className="text-gray-400 text-[12px] text-center">
                    No cheer teams are available to draft right now.
                  </Text>
                </View>
              )}
              {playersList.map((player: any, idx: number) => (
                <TouchableOpacity
                  key={`${player.id}-${idx}`}
                  className="flex-row items-center justify-between bg-[#242424] border border-[#333] p-3.5 rounded-2xl mb-3"
                  activeOpacity={0.7}
                  // Only a request in flight disables the row. Disabling it for
                  // "not your turn" made the tap do nothing at all, with no
                  // explanation - the handler below says why instead.
                  disabled={isDrafting}
                  onPress={async () => {
                    if (isAuctionDraft) {
                      openDivisionPicker(player);
                      return;
                    }

                    if (isSnakeDraft && !isDraftRunning) {
                      showToast.error(
                        'Draft not open',
                        'The draft has not started yet.',
                      );
                      return;
                    }
                    if (isSnakeDraft && !isMyTurn) {
                      showToast.error(
                        'Not your turn',
                        `${
                          draftState?.currentTeam?.name || 'Another team'
                        } is on the clock.`,
                      );
                      return;
                    }
                    if (!leagueId || !userTeamId) {
                      Alert.alert(
                        'Not Joined Yet',
                        'You must join this league to draft cheer teams.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Join League Now',
                            onPress: async () => {
                              try {
                                const defaultName = `Team ${
                                  ((apiMembersData as any)?.length || 0) + 1
                                }`;
                                const joined: any = await joinLeagueMutation({
                                  id: leagueId,
                                  fantasyTeamName: defaultName,
                                }).unwrap();
                                const newTeamId =
                                  joined?.team?._id ||
                                  joined?.team?.id ||
                                  joined?._id;
                                if (newTeamId) {
                                  dispatch(
                                    setActiveTeam({
                                      leagueId,
                                      teamId: String(newTeamId),
                                    }),
                                  );
                                  showToast.success(
                                    'Joined Successfully!',
                                    `Joined as "${defaultName}". Please tap Pick again.`,
                                  );
                                }
                              } catch (e: any) {
                                showToast.error(
                                  'Join Error',
                                  e?.data?.message || 'Failed to join league.',
                                );
                              }
                            },
                          },
                        ],
                      );
                      return;
                    }
                    confirmDraft(player);
                  }}
                >
                  <View className="flex-row items-center flex-1 mr-2">
                    <Image
                      source={{ uri: player.avatarUri }}
                      className="w-12 h-12 rounded-full bg-[#333] mr-3"
                    />
                    <View className="flex-1">
                      <Text
                        className="text-white text-[15px] font-semibold mb-0.5"
                        numberOfLines={1}
                      >
                        {player.name}
                      </Text>
                      <Text className="text-gray-400 text-[12px]">
                        {player.subtitle}
                      </Text>
                    </View>
                  </View>
                  <View
                    className={`px-4 py-2 rounded-xl min-w-[76px] items-center ${
                      isSnakeDraft && !isMyTurn ? 'bg-[#3a3a3a]' : 'bg-[#8B3DFF]'
                    }`}
                  >
                    {pendingTeamId === String(player.id) ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text
                        className={`text-[13px] font-bold ${
                          isSnakeDraft && !isMyTurn
                            ? 'text-gray-400'
                            : 'text-white'
                        }`}
                      >
                        {isAuctionDraft ? 'Nominate' : 'Pick'}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!pendingAssignment}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingAssignment(null)}
      >
        <View className="flex-1 bg-black/80 justify-center px-6">
          <View className="bg-[#1a1a1a] border border-[#333] rounded-3xl p-5">
            <Text className="text-white text-[18px] font-bold mb-2">
              Nominate for which division?
            </Text>
            <Text className="text-gray-400 text-[13px] mb-5">
              {pendingAssignment?.player?.name} is nominated for one division,
              and the winning bidder rosters it there.
            </Text>
            {pendingAssignment?.divisions.map(division => (
              <TouchableOpacity
                key={division.id}
                className="border border-[#8B3DFF]/50 bg-[#8B3DFF]/10 rounded-2xl p-4 mb-3"
                onPress={() => confirmDivisionAssignment(division.id)}
              >
                <Text className="text-white text-[15px] font-semibold">
                  {division.name}
                </Text>
                <Text className="text-[#B98AFF] text-[12px] mt-1">
                  {division.code}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              className="rounded-2xl p-3 mt-1 items-center"
              onPress={() => setPendingAssignment(null)}
            >
              <Text className="text-gray-400">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
