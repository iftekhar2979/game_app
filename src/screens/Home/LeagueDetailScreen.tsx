import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MoreVertical, UserCheck, Plus, Users, Globe, Lock, Shield, Calendar, DollarSign, Layers, Info } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../App';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setActiveTeam } from '../../store/slices/leagueSlice';
import { useGetLeagueDetailsQuery, useGetLeagueMembersQuery, useJoinLeagueMutation, useGetAvailableAthletesQuery, useGetAthletePositionsQuery, useGetRosterSettingsQuery, useGetLeagueRostersQuery, useGetMyTeamRosterQuery, useGetCurrentMatchupQuery, useGetLeagueStandingsQuery, useGetMatchupHistoryQuery } from '../../store/api/leagueApi';
import { MatchupTab, DraftTab, TeamTab, PlayersTab, LeagueTab } from '../../components/LeagueDetail/LeagueDetailTabs';
import { AddTeamModal, PlayerDetailModal, LeagueSettingsModal, LeagueSettingsSubModal, DraftSettingsSubModal, RosterSettingsSubModal, MemberSettingsSubModal, GiveCommissionerAccessModal, LockRosterModal, DeleteLeagueModal, JoinLeagueModal, RosterPlayerActionModal } from '../../components/LeagueDetail/LeagueDetailModals';
import { getSocket, joinLeagueRoom, leaveLeagueRoom } from '../../services/socketService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'LeagueDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'LeagueDetail'>;

const MOCK_LEAGUES: any[] = [
  { id: 'mock-1', name: '2026 Final cheer', membersCount: 10, status: 'Draft' },
  { id: 'mock-2', name: '2026 Final cheer', membersCount: 12, status: 'Draft' },
  { id: 'mock-3', name: '2026 Final cheer', membersCount: 8, status: 'Play' },
];

interface TeamMember {
  id: string;
  teamId?: string;
  name: string;
  handle: string;
  avatarUri?: string;
  role?: string;
  budgetRemaining?: number;
  joinedAt?: string;
}


const MOCK_TEAM_MEMBERS: TeamMember[] = [
  { id: 't1', name: 'Team Cheerleading', handle: '@cheerleading' },
  { id: 't2', name: 'Team Rubel', handle: '@rubel' },
  { id: 't3', name: 'Team Okafor', handle: '@okafor' },
  { id: 't4', name: 'Team Walter', handle: '@walter' },
  { id: 't5', name: 'Team Noah', handle: '@noah' },
  { id: 't6', name: 'Team Leo', handle: '@leo' },
];

const MOCK_LEAGUE_STANDINGS = [
  { id: 'l1', name: 'Team Cheerleading', handle: '@cheerleading', score: '0 - 0' },
  { id: 'l2', name: 'Team Cheerleading', handle: '@cheerleading', score: '0 - 0' },
  { id: 'l3', name: 'Team Cheerleading', handle: '@cheerleading', score: '0 - 0' },
];

export interface ApiLeaguePayload {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  logoUrl?: string;
  logoUri?: string;
  visibility?: 'public' | 'private';
  status?: string;
  joinedTeamCount?: number;
  membersCount?: number;
  maxTeams?: number;
  code?: string;
  seasonId?: string;
  creatorId?: string;
  draftStartsAt?: string;
  settings?: {
    draftSettings?: {
      draftStartsAt?: string;
    };
  };
}

export interface ApiCallerInfo {
  isMember: boolean;
  isCreator: boolean;
  canJoin: boolean;
  canEdit: boolean;
}

export interface ApiLeagueDetailsResponse {
  league?: ApiLeaguePayload;
  caller?: ApiCallerInfo;
}

export default function LeagueDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { leagueId } = route.params;

  // Fetch real API league data if leagueId is a valid 24-character MongoDB ObjectId
  const isRealApiId = !!leagueId && /^[0-9a-fA-F]{24}$/.test(String(leagueId));
  const isMockId = !isRealApiId;
  const { data: apiLeagueData, isLoading: isApiLoading, refetch: refetchLeagueDetails } = useGetLeagueDetailsQuery(leagueId, {
    skip: isMockId,
    refetchOnMountOrArgChange: true,
  });
  const { data: apiMembersData, refetch: refetchMembers } = useGetLeagueMembersQuery(leagueId, {
    skip: isMockId,
  });
  // Players tab: search term is debounced so typing does not fire a request per keystroke.
  const [playerSearch, setPlayerSearch] = useState('');
  const [debouncedPlayerSearch, setDebouncedPlayerSearch] = useState('');
  const [playerPositionId, setPlayerPositionId] = useState<string | null>(null);
  const [playersPage, setPlayersPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPlayerSearch(playerSearch.trim()), 350);
    return () => clearTimeout(timer);
  }, [playerSearch]);

  // A new search or position filter restarts paging from the first page.
  useEffect(() => {
    setPlayersPage(1);
  }, [debouncedPlayerSearch, playerPositionId]);

  const {
    data: apiAthletesData,
    isLoading: isPlayersLoading,
    isFetching: isPlayersFetching,
    refetch: refetchAvailableAthletes,
  } = useGetAvailableAthletesQuery(
    {
      leagueId,
      term: debouncedPlayerSearch || undefined,
      positionId: playerPositionId || undefined,
      page: playersPage,
    },
    { skip: isMockId },
  );

  const { data: athletePositions = [] } = useGetAthletePositionsQuery(undefined, {
    skip: isMockId,
  });

  const { data: rosterSettings, refetch: refetchRosterSettings } = useGetRosterSettingsQuery(leagueId, {
    skip: isMockId,
  });
  const { data: apiRostersData, refetch: refetchLeagueRosters } = useGetLeagueRostersQuery(leagueId, {
    skip: isMockId,
  });
  const { data: apiMatchupData, refetch: refetchMatchup } = useGetCurrentMatchupQuery(leagueId, {
    skip: isMockId,
  });
  const { data: apiStandingsData, refetch: refetchStandings } = useGetLeagueStandingsQuery(leagueId, {
    skip: isMockId,
  });
  const { data: apiHistoryData, refetch: refetchHistory } = useGetMatchupHistoryQuery(leagueId, {
    skip: isMockId,
  });

  // Resolved API league payload
  const rawLeague: ApiLeaguePayload | undefined = (apiLeagueData as ApiLeagueDetailsResponse)?.league || (apiLeagueData as ApiLeaguePayload);
  const targetSeasonId = rawLeague?.seasonId;

  // Debug logger for API calls and response tracking
  useEffect(() => {
    console.log('[LeagueDetailScreen] Params leagueId:', leagueId, '| isRealApiId:', isRealApiId, '| isMockId:', isMockId);
    if (isRealApiId) {
      console.log('[LeagueDetailScreen] isApiLoading:', isApiLoading);
      console.log('[LeagueDetailScreen] rawLeague:', JSON.stringify(rawLeague, null, 2));
      console.log('[LeagueDetailScreen] apiMembersData:', JSON.stringify(apiMembersData, null, 2));
      console.log('[LeagueDetailScreen] apiRostersData:', JSON.stringify(apiRostersData, null, 2));
      console.log('[LeagueDetailScreen] apiMatchupData:', JSON.stringify(apiMatchupData, null, 2));
      console.log('[LeagueDetailScreen] apiStandingsData:', JSON.stringify(apiStandingsData, null, 2));
    }
  }, [leagueId, isRealApiId, isMockId, isApiLoading, rawLeague, apiMembersData, apiRostersData, apiMatchupData, apiStandingsData]);

  const [joinLeagueMutation, { isLoading: isJoiningLeague }] = useJoinLeagueMutation();

  const playersList = useMemo(() => {
    const rawList = apiAthletesData?.items || [];

    return rawList.map((item: any, idx: number) => {
      const athlete = item.athlete || item.athleteId || {};
      const name =
        athlete.displayName ||
        `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim() ||
        'Unknown Player';

      const positionCode = item.eligiblePositionIds?.[0]?.code;
      const nflTeam = item.organizationId?.shortName || item.organizationId?.name;

      return {
        id: item._id || item.id || `p-${idx}`,
        seasonAthleteId: item._id,
        name,
        subtitle: [positionCode, nflTeam].filter(Boolean).join(' • ') || 'Free agent',
        value: item.openingValue ?? null,
        avatarUri: athlete.photoUrl || null,
      };
    });
  }, [apiAthletesData]);

  const callerInfo = apiLeagueData?.caller;

  const createdLeagues = useSelector((state: RootState) => state.league.leagues);
  const mockFallback = isMockId
    ? (createdLeagues.find(l => String(l.id || (l as any)._id) === String(leagueId)) ||
       MOCK_LEAGUES.find(l => String(l.id) === String(leagueId)) ||
       MOCK_LEAGUES[0])
    : null;

  const draftStartsAt =
    rawLeague?.draftStartsAt ||
    rawLeague?.settings?.draftSettings?.draftStartsAt ||
    mockFallback?.draftStartsAt ||
    mockFallback?.draftDate;

  // Memoised: the draft countdown re-renders this screen every second, and a fresh
  // league object each time would churn every child that receives it.
  const league = useMemo(() => (rawLeague
    ? {
        id: rawLeague._id || rawLeague.id || leagueId,
        name: rawLeague.name || 'Fantasy League',
        logoUri:
          rawLeague.logoUrl ||
          rawLeague.logoUri ||
          'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=150&auto=format&fit=crop',
        membersCount: rawLeague.joinedTeamCount ?? rawLeague.membersCount ?? rawLeague.maxTeams ?? 1,
        maxTeams: rawLeague.maxTeams ?? 12,
        status:
          rawLeague.status === 'registration_open' || rawLeague.status === 'drafting'
            ? 'Draft'
            : rawLeague.status || 'Draft',
        code: rawLeague.code || '',
        description: rawLeague.description || '',
        // `status` above is a display label; settings screens need the real value.
        rawStatus: rawLeague.status,
        joinedTeamCount: rawLeague.joinedTeamCount,
        draftSettings: (rawLeague as any).draftSettings,
        visibility: rawLeague.visibility || 'public',
        draftStartsAt,
      }
    : mockFallback), [rawLeague, mockFallback, draftStartsAt, leagueId]);


  const [currentLeagueStatus, setCurrentLeagueStatus] = useState(league?.status);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [isDraftStarted, setIsDraftStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<'Matchup' | 'Draft' | 'Team' | 'Players' | 'League'>(currentLeagueStatus === 'Play' ? 'Matchup' : 'Draft');

  const [isUserJoined, setIsUserJoined] = useState(false);
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const [joinErrorText, setJoinErrorText] = useState<string | null>(null);

  const [selectedRosterItem, setSelectedRosterItem] = useState<any | null>(null);
  const [isRosterActionModalVisible, setIsRosterActionModalVisible] = useState(false);

  useEffect(() => {
    if (league?.status) {
      setCurrentLeagueStatus(league.status);
    }
  }, [league?.status]);

  const dispatch = useDispatch();
  const reduxActiveTeamId = useSelector((state: RootState) => state.league.activeTeams?.[leagueId]?.teamId);
  const currentUserId = useSelector((state: RootState) => (state.auth?.user as any)?._id || (state.auth?.user as any)?.id);

  // The authenticated user's own fantasy team roster, resolved by the backend
  // rather than filtered out of the full league roster list client-side.
  const {
    data: myRoster,
    isLoading: isMyRosterLoading,
    refetch: refetchMyRoster,
  } = useGetMyTeamRosterQuery(leagueId, {
    skip: isMockId || !isUserJoined,
    refetchOnMountOrArgChange: true,
  });

  const rosterTeam = useMemo(() => {
    const rawRosters = Array.isArray(apiRostersData)
      ? apiRostersData
      : Array.isArray((apiRostersData as any)?.data)
      ? (apiRostersData as any).data
      : [];
    if (!currentUserId || rawRosters.length === 0) return null;
    return rawRosters.find((r: any) => {
      const ownerId = r.ownerId || r.ownerUserId || r.userId?._id || r.userId?.id || r.userId;
      return String(ownerId) === String(currentUserId);
    });
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

  const userTeamId =
    myRoster?.team?._id ||
    reduxActiveTeamId ||
    rosterTeam?._id ||
    rosterTeam?.id ||
    userTeamObj?.team?._id ||
    userTeamObj?.team?.id ||
    userTeamObj?._id ||
    callerInfo?.team?._id ||
    callerInfo?.team?.id;

  // Persist user team ID to Redux global state
  useEffect(() => {
    if (leagueId && userTeamId && userTeamId !== reduxActiveTeamId) {
      dispatch(setActiveTeam({ leagueId, teamId: String(userTeamId) }));
    }
  }, [leagueId, userTeamId, reduxActiveTeamId, dispatch]);



  // Pull down to re-read everything this screen shows. Runs the refetches in
  // parallel and settles even if one of them rejects, so a single failing query
  // cannot leave the spinner stuck.
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (isMockId) return;
    setIsRefreshing(true);
    try {
      await Promise.allSettled(
        [
          refetchLeagueDetails,
          refetchMembers,
          refetchAvailableAthletes,
          refetchLeagueRosters,
          refetchMyRoster,
          refetchMatchup,
          refetchStandings,
          refetchHistory,
          refetchRosterSettings,
        ]
          .filter(Boolean)
          .map((fn) => Promise.resolve(fn())),
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [
    isMockId,
    refetchLeagueDetails,
    refetchMembers,
    refetchAvailableAthletes,
    refetchLeagueRosters,
    refetchMyRoster,
    refetchMatchup,
    refetchStandings,
    refetchHistory,
    refetchRosterSettings,
  ]);

  useEffect(() => {
    if (callerInfo?.isMember !== undefined) {
      setIsUserJoined(callerInfo.isMember || callerInfo.isCreator);
    } else if (rawLeague?.creatorId && currentUserId) {
      if (String(rawLeague.creatorId) === String(currentUserId)) {
        setIsUserJoined(true);
      }
    }
  }, [callerInfo, rawLeague?.creatorId, currentUserId]);

  const [teamSlots, setTeamSlots] = useState<(TeamMember | null)[]>(() => {
    return new Array(league?.maxTeams || 12).fill(null);
  });

  const [realtimeNotification, setRealtimeNotification] = useState<string | null>(null);
  const lastHandledEventRef = useRef<string | null>(null);

  // Sync real backend members list into teamSlots
  useEffect(() => {
    if (apiMembersData) {
      const memberList = Array.isArray(apiMembersData)
        ? apiMembersData
        : Array.isArray(apiMembersData?.data)
        ? apiMembersData.data
        : [];

      const maxCapacity = league?.maxTeams || 12;
      const newSlots: (TeamMember | null)[] = new Array(maxCapacity).fill(null);

      // The members payload does not always carry the fantasy team, so keep an
      // owner -> team id map from the rosters call to fall back on. Without a team
      // id a row cannot open its roster.
      const rawRosters = Array.isArray(apiRostersData)
        ? apiRostersData
        : Array.isArray((apiRostersData as any)?.data)
        ? (apiRostersData as any).data
        : [];
      const teamIdByOwner = new Map<string, string>();
      rawRosters.forEach((r: any) => {
        const owner = r.ownerId?._id || r.ownerId || r.ownerUserId;
        const id = r._id || r.id;
        if (owner && id) teamIdByOwner.set(String(owner), String(id));
      });

      if (memberList.length > 0) {
        memberList.forEach((m: any, idx: number) => {
          if (idx < maxCapacity) {
            const teamObj = m.team || {};
            const userObj = m.user || (typeof m.userId === 'object' ? m.userId : {});

            const teamName = teamObj.name || m.fantasyTeamName || userObj.fullName || userObj.username || m.name || `Fantasy Team ${idx + 1}`;
            const rawUsername = userObj.username || userObj.fullName || teamName;
            const handle = teamObj.handle || m.handle || `@${rawUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

            const avatarUri =
              teamObj.avatarUri ||
              teamObj.logoUrl ||
              userObj.avatarUrl ||
              m.avatarUri ||
              `https://i.pravatar.cc/150?img=${(idx % 12) + 1}`;

            const ownerId =
              userObj._id ||
              userObj.id ||
              (typeof m.userId === 'string' ? m.userId : null) ||
              teamObj.ownerId;

            newSlots[idx] = {
              id: m._id || m.id || `member-${idx}`,
              teamId:
                teamObj._id ||
                teamObj.id ||
                (ownerId ? teamIdByOwner.get(String(ownerId)) : undefined),
              name: teamName,
              handle,
              avatarUri,
              role: m.role === 'creator' || m.role === 'commissioner' || idx === 0 ? 'Commissioner' : 'Joined',
              budgetRemaining: teamObj.budgetRemaining ?? 100,
            };
          }
        });
        setTeamSlots(newSlots);
      }
    }
  }, [apiMembersData, apiRostersData, league?.maxTeams]);


  // Real-Time WebSocket Connection & Single Deduplicated Event Listener
  useEffect(() => {
    if (!leagueId) return;

    try {
      const socket = getSocket();
      joinLeagueRoom(leagueId);

      const handleTeamJoined = (eventData: any) => {
        if (!eventData || (eventData.leagueId && String(eventData.leagueId) !== String(leagueId))) {
          return;
        }

        const joinedTeam = eventData.team || {};
        const teamId = joinedTeam.id || joinedTeam._id || joinedTeam.name;
        const eventKey = `${leagueId}-${teamId}`;

        // Deduplicate: ignore if this exact event was processed within last 3 seconds
        if (lastHandledEventRef.current === eventKey) {
          return;
        }
        lastHandledEventRef.current = eventKey;
        setTimeout(() => {
          if (lastHandledEventRef.current === eventKey) {
            lastHandledEventRef.current = null;
          }
        }, 3000);

        const teamName = joinedTeam.name || 'A new team';

        setRealtimeNotification(`🔥 ${teamName} just joined the league!`);

        // Dynamically add team to slots if not already added
        setTeamSlots(prevSlots => {
          const exists = prevSlots.some(s => s && (s.id === teamId || s.name === teamName));
          if (exists) return prevSlots;

          const slots = [...prevSlots];
          const emptyIdx = slots.findIndex(s => s === null);
          if (emptyIdx !== -1) {
            slots[emptyIdx] = {
              id: teamId || `rt-${Date.now()}`,
              name: teamName,
              handle: joinedTeam.handle || `@${teamName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
              avatarUri: joinedTeam.avatarUri || `https://i.pravatar.cc/150?img=${(emptyIdx % 12) + 1}`,
              role: joinedTeam.role || 'Joined',
            };
          }
          return slots;
        });

        if (refetchMembers) refetchMembers();

        setTimeout(() => {
          setRealtimeNotification(null);
        }, 5000);
      };

      socket.on('teamJoined', handleTeamJoined);

      const handlePlayerAcquired = (eventData: any) => {
        if (!eventData || (eventData.leagueId && String(eventData.leagueId) !== String(leagueId))) {
          return;
        }
        if (refetchAvailableAthletes) refetchAvailableAthletes();
        if (refetchLeagueRosters) refetchLeagueRosters();
      };

      socket.on('playerAcquired', handlePlayerAcquired);

      const handlePlayerDropped = (eventData: any) => {
        if (!eventData || (eventData.leagueId && String(eventData.leagueId) !== String(leagueId))) {
          return;
        }
        if (refetchAvailableAthletes) refetchAvailableAthletes();
        if (refetchLeagueRosters) refetchLeagueRosters();
      };

      socket.on('playerDropped', handlePlayerDropped);

      const handleMatchupUpdated = (eventData: any) => {
        if (!eventData || (eventData.leagueId && String(eventData.leagueId) !== String(leagueId))) {
          return;
        }
        if (refetchAvailableAthletes) refetchAvailableAthletes();
        if (refetchLeagueRosters) refetchLeagueRosters();
        if (refetchMatchup) refetchMatchup();
        if (refetchStandings) refetchStandings();
        if (refetchHistory) refetchHistory();
      };

      socket.on('matchupUpdated', handleMatchupUpdated);

      return () => {
        socket.off('teamJoined', handleTeamJoined);
        socket.off('playerAcquired', handlePlayerAcquired);
        socket.off('playerDropped', handlePlayerDropped);
        socket.off('matchupUpdated', handleMatchupUpdated);
        leaveLeagueRoom(leagueId);
      };
    } catch (e) {
      console.warn('Socket connection error:', e);
    }
  }, [leagueId, refetchMembers]);




  const [isAddTeamModalVisible, setIsAddTeamModalVisible] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  const [isPlayerModalVisible, setIsPlayerModalVisible] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isLeagueSettingsSubModalVisible, setIsLeagueSettingsSubModalVisible] = useState(false);
  const [isRosterSettingsSubModalVisible, setIsRosterSettingsSubModalVisible] = useState(false);
  const [isDraftSettingsSubModalVisible, setIsDraftSettingsSubModalVisible] = useState(false);
  const [isMemberSettingsSubModalVisible, setIsMemberSettingsSubModalVisible] = useState(false);
  const [isCommissionerModalVisible, setIsCommissionerModalVisible] = useState(false);
  const [isLockRosterModalVisible, setIsLockRosterModalVisible] = useState(false);
  const [isDeleteLeagueModalVisible, setIsDeleteLeagueModalVisible] = useState(false);

  const handleSettingsOptionSelect = (optionTitle: string) => {
    if (optionTitle === 'League settings') {
      setIsLeagueSettingsSubModalVisible(true);
    } else if (optionTitle === 'Roster settings') {
      setIsRosterSettingsSubModalVisible(true);
    } else if (optionTitle === 'Draft settings') {
      setIsDraftSettingsSubModalVisible(true);
    } else if (optionTitle === 'Member settings') {
      setIsMemberSettingsSubModalVisible(true);
    } else if (optionTitle === 'Commissioner control') {
      setIsCommissionerModalVisible(true);
    } else if (optionTitle === 'Team settings') {
      setIsLockRosterModalVisible(true);
    } else if (optionTitle === 'Delete league') {
      setIsDeleteLeagueModalVisible(true);
    }
  };

  const handleAddTeam = (team: TeamMember) => {
    if (selectedSlotIndex !== null) {
      const newSlots = [...teamSlots];
      newSlots[selectedSlotIndex] = team;
      setTeamSlots(newSlots);
      setIsAddTeamModalVisible(false);
    }
  };

  const handleJoinLeague = async (fantasyTeamName: string) => {
    try {
      setJoinErrorText(null);
      if (!isMockId) {
        await joinLeagueMutation({ id: leagueId, fantasyTeamName }).unwrap();
        if (refetchLeagueDetails) refetchLeagueDetails();
        if (refetchMembers) refetchMembers();
      }
      const newSlots = [...teamSlots];
      const emptyIndex = newSlots.findIndex(s => s === null);
      const targetIndex = selectedSlotIndex !== null && newSlots[selectedSlotIndex] === null ? selectedSlotIndex : (emptyIndex !== -1 ? emptyIndex : 0);
      const joinedTeamObj = {
        id: `my-team-${Date.now()}`,
        name: fantasyTeamName,
        handle: `@${fantasyTeamName.toLowerCase().replace(/\s+/g, '')}`,
        role: 'Joined',
      };
      newSlots[targetIndex] = joinedTeamObj;
      setTeamSlots(newSlots);
      setIsUserJoined(true);
      setIsJoinModalVisible(false);

      // Emit socket event to notify server and all other users in real-time
      try {
        const socket = getSocket();
        socket.emit('teamJoined', {
          leagueId,
          team: joinedTeamObj,
        });
      } catch (e) {
        console.warn('Socket emit error on join:', e);
      }
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Failed to join league. Please try again.';
      setJoinErrorText(msg);
    }
  };



  useEffect(() => {
    const rawTarget =
      league?.draftStartsAt ||
      league?.settings?.draftSettings?.draftStartsAt ||
      league?.draftDate;

    if (!rawTarget) {
      setTimeLeft(null);
      setIsDraftStarted(false);
      return;
    }

    const targetTime = new Date(rawTarget).getTime();

    const calculateTime = () => {
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsDraftStarted(true);
        if (currentLeagueStatus !== 'Play') {
          setCurrentLeagueStatus('Play');
          setActiveTab('Matchup');
        }
        return;
      }

      setIsDraftStarted(false);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTime();
    const intervalId = setInterval(calculateTime, 1000);

    return () => clearInterval(intervalId);
  }, [league?.draftStartsAt, league?.settings?.draftSettings?.draftStartsAt, league?.draftDate, currentLeagueStatus]);

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

      {(!isMockId && (isApiLoading || !rawLeague)) ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#E0B566" />
          <Text className="text-gray-400 text-xs mt-3">Loading League Details...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#E0B566"
              colors={['#E0B566']}
              progressBackgroundColor="#111"
            />
          }
        >
          {/* Real-Time WebSocket Notification Banner */}
          {realtimeNotification ? (
            <View className="bg-[#8B3DFF] border border-purple-400 rounded-2xl p-4 mb-5 flex-row items-center justify-between shadow-xl animate-bounce">
              <View className="flex-row items-center flex-1 mr-2">
                <View className="w-9 h-9 rounded-full bg-white/20 items-center justify-center mr-3">
                  <Users color="#fff" size={18} />
                </View>
                <Text className="text-white text-[14px] font-bold flex-1" numberOfLines={2}>
                  {realtimeNotification}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRealtimeNotification(null)} className="bg-white/20 px-3 py-1 rounded-full border border-white/30">
                <Text className="text-white text-[11px] font-bold">Dismiss</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* League Info Row Card */}

          <View className="bg-[#111] border border-[#222] rounded-[24px] p-5 mb-5 shadow-lg">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-row items-center flex-1 mr-2">
                <Image
                  source={{ uri: league.logoUri || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=150&auto=format&fit=crop' }}
                  className="w-[56px] h-[56px] rounded-2xl bg-white border border-[#333] mr-3.5"
                />
                <View className="flex-1">
                  <Text className="text-white text-[20px] font-bold mb-1" numberOfLines={1}>{league.name}</Text>
                  
                  <View className="flex-row items-center flex-wrap gap-2">
                    {/* Visibility Badge */}
                    <View className="flex-row items-center bg-[#1e1a2b] border border-[#8B3DFF]/50 px-2.5 py-0.5 rounded-full">
                      {league.visibility === 'public' ? (
                        <Globe color="#E0B566" size={12} className="mr-1" />
                      ) : (
                        <Lock color="#E0B566" size={12} className="mr-1" />
                      )}
                      <Text className="text-[#E0B566] text-[11px] font-semibold uppercase">{league.visibility || 'Public'}</Text>
                    </View>

                    {/* Status Badge */}
                    <View className="bg-[#2a1a00] border border-[#FFB84D]/50 px-2.5 py-0.5 rounded-full">
                      <Text className="text-[#FFB84D] text-[11px] font-semibold">
                        {league.status === 'Draft' || league.status === 'registration_open' ? 'Pre-Draft' : league.status}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <TouchableOpacity className="p-2 border border-[#333] rounded-xl bg-[#1a1a1a]" onPress={() => setIsSettingsModalVisible(true)}>
                <MoreVertical color="#fff" size={18} />
              </TouchableOpacity>
            </View>

            {/* Quick Stats Line */}
            <View className="flex-row items-center justify-between border-t border-[#222] pt-3.5 mt-1">
              <View className="flex-row items-center">
                <Users color="#888" size={14} className="mr-1.5" />
                <Text className="text-gray-400 text-[12px] font-medium">Joined Teams:</Text>
                <Text className="text-[#E0B566] text-[12px] font-bold ml-1">
                  {`${teamSlots.filter(t => !!t).length} / ${league.maxTeams || 12}`}
                </Text>
              </View>

              {league.code ? (
                <View className="flex-row items-center">
                  <Text className="text-gray-400 text-[12px]">Code: </Text>
                  <Text className="text-[#8B3DFF] text-[12px] font-bold">{league.code}</Text>
                </View>
              ) : (
                <View className="flex-row items-center">
                  <Calendar color="#888" size={14} className="mr-1.5" />
                  <Text className="text-gray-400 text-[12px]">Draft Open</Text>
                </View>
              )}
            </View>
          </View>


          {/* Join Public League Banner */}
          {!isUserJoined ? (
            <View className="bg-[#1a132b] border border-[#8B3DFF] rounded-2xl p-4 mb-6 flex-row items-center justify-between shadow-lg">
              <View className="flex-1 mr-3">
                <View className="flex-row items-center mb-1">
                  <Users color="#E0B566" size={15} className="mr-1.5" />
                  <Text className="text-[#E0B566] text-[11px] font-bold tracking-wider">PUBLIC LEAGUE</Text>
                </View>
                <Text className="text-white text-[15px] font-bold">Open Registration!</Text>
                <Text className="text-gray-300 text-[12px] mt-0.5">Join this public league with your team.</Text>
              </View>
              <TouchableOpacity
                className="bg-[#8B3DFF] px-4 py-2.5 rounded-full flex-row items-center"
                activeOpacity={0.9}
                onPress={() => {
                  setJoinErrorText(null);
                  setIsJoinModalVisible(true);
                }}
              >
                <Plus color="#fff" size={16} className="mr-1" />
                <Text className="text-white text-[13px] font-bold">Join League</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-emerald-950/70 border border-emerald-500/40 rounded-xl px-4 py-2.5 mb-6 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <UserCheck color="#34d399" size={16} className="mr-2" />
                <Text className="text-emerald-300 text-[13px] font-semibold">Your team has joined this league</Text>
              </View>
              <TouchableOpacity
                className="bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-500/30"
                onPress={() => setActiveTab('Team')}
              >
                <Text className="text-emerald-200 text-[11px] font-bold">View Team</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tabs */}
          <View className="flex-row justify-between items-center mb-6 px-1">
            {currentLeagueStatus === 'Play' ? (
              <TouchableOpacity
                className={`${activeTab === 'Matchup' ? 'bg-[#FFB84D]' : 'bg-transparent'} px-5 py-2 rounded-xl`}
                onPress={() => setActiveTab('Matchup')}
              >
                <Text className={`${activeTab === 'Matchup' ? 'text-white' : 'text-gray-400'} text-[15px] font-semibold`}>Matchup</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className={`${activeTab === 'Draft' ? 'bg-[#FFB84D]' : 'bg-transparent'} px-5 py-2 rounded-xl`}
                onPress={() => setActiveTab('Draft')}
              >
                <Text className={`${activeTab === 'Draft' ? 'text-white' : 'text-gray-400'} text-[15px] font-semibold`}>Draft</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className={`${activeTab === 'Team' ? 'bg-[#FFB84D]' : 'bg-transparent'} px-5 py-2 rounded-xl`}
              onPress={() => setActiveTab('Team')}
            >
              <Text className={`${activeTab === 'Team' ? 'text-white' : 'text-gray-400'} text-[15px] font-semibold`}>Team</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`${activeTab === 'Players' ? 'bg-[#FFB84D]' : 'bg-transparent'} px-3 py-2 rounded-xl`}
              onPress={() => setActiveTab('Players')}
            >
              <Text className={`${activeTab === 'Players' ? 'text-white' : 'text-gray-400'} text-[15px] font-semibold`}>Players</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`${activeTab === 'League' ? 'bg-[#FFB84D]' : 'bg-transparent'} px-3 py-2 rounded-xl`}
              onPress={() => setActiveTab('League')}
            >
              <Text className={`${activeTab === 'League' ? 'text-white' : 'text-gray-400'} text-[15px] font-semibold`}>League</Text>
            </TouchableOpacity>
          </View>

          {/* Matchup Tab Content */}
          {activeTab === 'Matchup' && (
            <MatchupTab
              leagueId={leagueId}
            />
          )}

          {/* Draft Tab Content */}
          {activeTab === 'Draft' && currentLeagueStatus !== 'Play' && (
            <DraftTab
              isDraftStarted={isDraftStarted}
              timeLeft={timeLeft}
              league={league}
              navigation={navigation}
            />
          )}

          {/* Team Tab Content */}
          {activeTab === 'Team' && (
            <TeamTab
              teamSlots={teamSlots}
              setSelectedSlotIndex={setSelectedSlotIndex}
              setIsAddTeamModalVisible={setIsAddTeamModalVisible}
              isMember={isUserJoined}
              onOpenJoinModal={() => {
                setJoinErrorText(null);
                setIsJoinModalVisible(true);
              }}
              maxTeams={league.maxTeams || 8}
              myRoster={myRoster}
              isMyRosterLoading={isMyRosterLoading}
              totalRosterSize={rosterSettings?.totalRosterSize}
              onSelectRosterPlayer={(player: any) => {
                setSelectedRosterItem(player);
                setIsRosterActionModalVisible(true);
              }}
              onSelectTeam={(teamId: string, teamName: string) => {
                navigation.navigate('TeamRoster', { leagueId, teamId, teamName });
              }}
            />
          )}

          {/* Players Tab Content */}
          {activeTab === 'Players' && (
            <PlayersTab
              players={playersList}
              positions={athletePositions}
              searchTerm={playerSearch}
              onChangeSearchTerm={setPlayerSearch}
              selectedPositionId={playerPositionId}
              onSelectPosition={setPlayerPositionId}
              isLoading={isPlayersLoading}
              isFetching={isPlayersFetching}
              hasMore={!!apiAthletesData?.pagination?.nextPage}
              totalItems={apiAthletesData?.pagination?.totalItems ?? 0}
              onLoadMore={() => setPlayersPage((p) => p + 1)}
              onSelectPlayer={(player: any) => {
                setSelectedPlayer(player);
                setIsPlayerModalVisible(true);
              }}
            />
          )}


          {/* League Tab Content */}
          {activeTab === 'League' && (
            <LeagueTab leagueId={leagueId} userTeamId={userTeamId} league={league} />
          )}

        </ScrollView>
      )}

      {/* Join League Modal */}
      <JoinLeagueModal
        isVisible={isJoinModalVisible}
        onClose={() => setIsJoinModalVisible(false)}
        onJoin={handleJoinLeague}
        isLoading={isJoiningLeague}
        leagueName={league?.name}
        errorText={joinErrorText}
      />

      {/* Add Team Modal */}
      <AddTeamModal
        isVisible={isAddTeamModalVisible}
        onClose={() => setIsAddTeamModalVisible(false)}
        teamMembers={MOCK_TEAM_MEMBERS}
        onAddTeam={handleAddTeam}
      />

      {/* Player Detail Modal */}
      <PlayerDetailModal
        isVisible={isPlayerModalVisible}
        onClose={() => setIsPlayerModalVisible(false)}
        selectedPlayer={selectedPlayer}
        seasonId={targetSeasonId}
        leagueId={leagueId}
        userTeamId={userTeamId}
        onAddSuccess={() => {
          if (refetchAvailableAthletes) refetchAvailableAthletes();
          if (refetchLeagueRosters) refetchLeagueRosters();
          if (refetchMyRoster) refetchMyRoster();
        }}
      />

      {/* Roster Player Action Modal (Lineup swap / Drop player) */}
      <RosterPlayerActionModal
        isVisible={isRosterActionModalVisible}
        onClose={() => setIsRosterActionModalVisible(false)}
        selectedRosterItem={selectedRosterItem}
        leagueId={leagueId}
        userTeamId={userTeamId}
        onSuccess={() => {
          if (refetchAvailableAthletes) refetchAvailableAthletes();
          if (refetchLeagueRosters) refetchLeagueRosters();
          if (refetchMyRoster) refetchMyRoster();
        }}
      />


      {/* Settings Modal */}
      <LeagueSettingsModal
        isVisible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
        onOptionSelect={handleSettingsOptionSelect}
      />

      <LeagueSettingsSubModal
        isVisible={isLeagueSettingsSubModalVisible}
        onClose={() => setIsLeagueSettingsSubModalVisible(false)}
        leagueId={leagueId}
        league={league}
        canEdit={!!callerInfo?.isCreator}
      />

      <DraftSettingsSubModal
        isVisible={isDraftSettingsSubModalVisible}
        onClose={() => setIsDraftSettingsSubModalVisible(false)}
        leagueId={leagueId}
        league={league}
        canEdit={!!callerInfo?.isCreator}
      />

      <RosterSettingsSubModal
        isVisible={isRosterSettingsSubModalVisible}
        onClose={() => setIsRosterSettingsSubModalVisible(false)}
        leagueId={leagueId}
      />

      <MemberSettingsSubModal
        isVisible={isMemberSettingsSubModalVisible}
        onClose={() => setIsMemberSettingsSubModalVisible(false)}
      />

      <GiveCommissionerAccessModal
        isVisible={isCommissionerModalVisible}
        onClose={() => setIsCommissionerModalVisible(false)}
      />

      <LockRosterModal
        isVisible={isLockRosterModalVisible}
        onClose={() => setIsLockRosterModalVisible(false)}
      />

      <DeleteLeagueModal
        isVisible={isDeleteLeagueModalVisible}
        onClose={() => setIsDeleteLeagueModalVisible(false)}
        onDelete={() => {
          setIsDeleteLeagueModalVisible(false);
          navigation.goBack();
        }}
      />

    </SafeAreaView>
  );
}
