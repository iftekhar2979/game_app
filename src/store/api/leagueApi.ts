import { baseApi } from './baseApi';
import {
  buildCurrentMatchupRequest,
  currentMatchupCacheKey,
  type CurrentMatchupQueryArg,
} from './matchupQuery';

export interface DraftSettingsPayload {
  // Matches the server DraftType enum; only 'auction' is executable today.
  type: 'auction' | 'snake' | 'linear' | 'offline';
  // Mirrors the server DraftOrderStrategy enum — separate from DraftType.
  orderStrategy: 'random' | 'manual' | 'reverse_standings';
  startingBudget: number;
  minimumBid: number;
  bidIncrement: number;
  nominationDurationSeconds: number;
  biddingDurationSeconds: number;
  pickDurationSeconds?: number;
  draftStartsAt?: string;
}

export interface CreateLeaguePayload {
  seasonId: string;
  name: string;
  description?: string;
  logoUrl?: string;
  visibility: 'public' | 'private';
  maxTeams: number;
  fantasyTeamName: string;
  draftSettings: DraftSettingsPayload;
  matchupSettings?: { format: 'head_to_head' | 'total_points' };
}

export interface LeagueResponse {
  _id: string;
  name: string;
  status: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  message: string;
  data: T;
}

export interface LeagueItem {
  _id: string;
  id?: string;
  name: string;
  status: string;
  joinedTeamCount?: number;
  maxTeams?: number;
  membersCount?: number;
  logoUri?: string;
}

export interface RosterPlayer {
  ownershipId: string;
  seasonAthleteId: string;
  athleteId: string | null;
  name: string;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  positionCode: string;
  assignedPositionId: string | null;
  assignedPosition: string | null;
  eligiblePositions: {
    _id: string;
    code: string | null;
    name: string | null;
  }[];
  nflTeam: string | null;
  nflTeamLogoUrl: string | null;
  country?: string | null;
  division?: string | null;
  realTeam?: string | null;
  openingValue: number | null;
  lineupStatus: 'starter' | 'bench' | 'injured_reserve' | 'taxi_squad';
  acquisitionMethod: string;
  acquisitionCost: number;
  acquiredAt: string | null;
}

export interface TeamRosterSummary {
  _id: string;
  leagueId: string;
  ownerId: string;
  name: string;
  logoUrl: string | null;
  isOwnedByMe: boolean;
  rosterCount: number;
  draftBudgetRemaining: number;
  faabBalance: number;
  totalPoints: number;
  pointsAgainst: number;
  wins: number;
  losses: number;
  ties: number;
  currentRank: number | null;
  waiverPriority: number | null;
}

export interface TeamOwner {
  _id: string;
  fullName: string | null;
  avatarUrl: string | null;
  totalScore: number | null;
  isMe: boolean;
  leagueRole: string | null;
  joinedAt: string | null;
}

export interface TeamRosterResponse {
  owner: TeamOwner;
  team: TeamRosterSummary;
  rosterCount: number;
  starterCount: number;
  benchCount: number;
  starters: RosterPlayer[];
  bench: RosterPlayer[];
  players: RosterPlayer[];
}

export interface AvailableAthlete {
  _id: string;
  openingValue: number | null;
  isEligible: boolean;
  athlete: {
    _id?: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
  };
  organizationId?: {
    _id: string;
    name?: string;
    shortName?: string;
    logoUrl?: string;
  };
  eligiblePositionIds?: { _id: string; code?: string; name?: string }[];
}

export interface Pagination {
  currentPage: number;
  totalItems: number;
  totalPages: number;
  nextPage: number | null;
  previousPage: number | null;
  itemsPerPage: number;
}

export interface AvailableAthletesPage {
  items: AvailableAthlete[];
  pagination: Pagination | null;
}

export interface AvailableAthletesArgs {
  leagueId: string;
  term?: string;
  positionId?: string;
  page?: number;
  limit?: number;
}

export interface RosterSettingsSlot {
  positionId: string;
  code: string | null;
  name: string | null;
  minimum: number;
  maximum: number;
  starterCount: number;
}

export interface RosterSettings {
  leagueId: string;
  rosterTemplateId: string;
  isLeagueOwned: boolean;
  canEdit: boolean;
  lockedReason: string | null;
  slots: RosterSettingsSlot[];
  benchSize: number;
  starterCount: number;
  totalRosterSize: number;
}

export interface UpdateRosterSettingsPayload {
  leagueId: string;
  slots: {
    positionId: string;
    minimum: number;
    maximum: number;
    starterCount: number;
  }[];
  benchSize: number;
}

export const LEAGUE_STATUSES = [
  'draft',
  'registration_open',
  'registration_closed',
  'auction_scheduled',
  'auction_active',
  'active',
  'completed',
  'cancelled',
] as const;

export type LeagueStatusValue = (typeof LEAGUE_STATUSES)[number];

export interface PartialDraftSettings {
  startingBudget?: number;
  minimumBid?: number;
  bidIncrement?: number;
  nominationDurationSeconds?: number;
  biddingDurationSeconds?: number;
  pickDurationSeconds?: number;
  draftStartsAt?: string;
}

export interface UpdateLeaguePayload {
  id: string;
  name?: string;
  description?: string;
  logoUrl?: string;
  maxTeams?: number;
  status?: LeagueStatusValue;
  draftSettings?: PartialDraftSettings;
  fantasyCheerSettings?: Partial<{
    rosterSize: number;
    starterCount: number;
    regularSeasonPeriods: number;
    officialScoreMultiplier: number;
    deductionMultiplier: number;
    hitZeroBonus: number;
    advancementBonus: number;
    championshipBonus: number;
    placementPoints: Record<string, number>;
    scoreBands: Array<{ minimum: number; maximum: number; points: number }>;
    divisionWinBonuses: Array<{
      minimumOtherTeams: number;
      maximumOtherTeams: number | null;
      points: number;
    }>;
    lastPlacePenalties: Array<{
      minimumOtherTeams: number;
      maximumOtherTeams: number | null;
      points: number;
    }>;
    grandChampionBonus: number;
  }>;
}

export interface DraftTeamRef {
  fantasyTeamId: string;
  name: string | null;
  ownerId: string | null;
}

export interface DraftState {
  leagueId: string;
  type: 'auction' | 'snake' | 'linear' | 'offline' | null;
  orderStrategy: string | null;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  isTurnOrdered: boolean;
  order: DraftTeamRef[];
  currentPick: number | null;
  currentRound: number | null;
  currentTeam: DraftTeamRef | null;
  nextTeam: DraftTeamRef | null;
  totalPicks: number;
  totalRounds: number;
  startedAt?: string | null;
  completedAt?: string | null;
  /** Every slot with its owning team, resolved server-side. */
  board: DraftBoardSlot[];
}

export interface DraftBoardSlot {
  pickNumber: number;
  round: number;
  fantasyTeamId: string | null;
}

export interface DraftPickRecord {
  pickNumber: number;
  round: number;
  fantasyTeamId: string;
  teamName: string | null;
  seasonAthleteId: string;
  playerName: string;
  positionCode: string | null;
  nflTeam: string | null;
  division?: string | null;
  country?: string | null;
  pickedAt: string;
}

export interface ScoringRule {
  metricCode: string;
  calculationType: 'fixed' | 'multiplier' | 'placement_table';
  points: number | null;
  multiplier: number | null;
  placementPoints: Record<string, number> | null;
  minimumValue: number | null;
  maximumValue: number | null;
}

export interface ScoringSettings {
  leagueId: string;
  scoringRuleSetId: string;
  name: string;
  version: number;
  status: string;
  categories: { category: string; rules: ScoringRule[] }[];
  ruleCount: number;
  editable: boolean;
  readOnlyReason: string;
}

export interface JoinLeaguePayload {
  id: string;
  fantasyTeamName: string;
}

export interface JoinByCodePayload {
  code: string;
  fantasyTeamName: string;
}

export interface LeaguesQueryParams {
  mine?: boolean;
  term?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface LeaguesPageResponse {
  data: LeagueItem[];
  pagination: Pagination | null;
}

export const leagueApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    createLeague: builder.mutation<LeagueResponse, CreateLeaguePayload>({
      query: body => ({
        url: 'leagues',
        method: 'POST',
        body,
      }),
      transformResponse: (
        response: ApiResponse<LeagueResponse> | LeagueResponse,
      ) => {
        if ('data' in response && response.data) {
          return response.data;
        }
        return response as LeagueResponse;
      },
      invalidatesTags: ['League'],
    }),
    updateLeague: builder.mutation<any, UpdateLeaguePayload>({
      query: ({ id, ...body }) => ({
        url: `leagues/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: any) => response?.data || response,
      invalidatesTags: (result, error, { id }) => [
        { type: 'League', id },
        'League',
      ],
    }),
    getLeagues: builder.query<LeaguesPageResponse, LeaguesQueryParams | void>({
      query: params => ({
        url: 'leagues',
        params: params
          ? {
              mine: params.mine,
              term: params.term,
              status: params.status,
              sortBy: params.sortBy,
              sortOrder: params.sortOrder,
              page: params.page,
              limit: params.limit,
            }
          : {},
      }),
      transformResponse: (response: any): LeaguesPageResponse => {
        const raw = response?.data !== undefined ? response.data : response;
        const items = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : [];
        const pagination = raw?.pagination || response?.pagination || null;
        return {
          data: items,
          pagination,
        };
      },
      providesTags: ['League'],
    }),
    joinByCode: builder.mutation<any, JoinByCodePayload>({
      query: body => ({
        url: 'leagues/join-by-code',
        method: 'POST',
        body,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      invalidatesTags: ['League'],
    }),
    getLeagueDetails: builder.query<any, string>({
      query: id => ({
        url: `leagues/${id}`,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: (result, error, id) => [{ type: 'League', id }],
    }),
    joinLeague: builder.mutation<any, JoinLeaguePayload>({
      query: ({ id, fantasyTeamName }) => ({
        url: `leagues/${id}/join`,
        method: 'POST',
        body: { fantasyTeamName },
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'League', id },
        'League',
      ],
    }),
    getLeagueMembers: builder.query<any, string>({
      query: id => ({
        url: `leagues/${id}/members`,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: (result, error, id) => [{ type: 'League', id }],
    }),
    // Paginated free-agent pool. Pages accumulate into a single cache entry so the
    // Players tab can append with "Load more"; changing the search term or position
    // filter starts a fresh entry.
    getAvailableAthletes: builder.query<
      AvailableAthletesPage,
      AvailableAthletesArgs
    >({
      query: ({ leagueId, term, positionId, page = 1, limit = 20 }) => ({
        url: `leagues/${leagueId}/available-athletes`,
        params: {
          page,
          limit,
          ...(term ? { term } : {}),
          ...(positionId ? { positionId } : {}),
        },
      }),
      transformResponse: (response: any): AvailableAthletesPage => {
        const raw = response?.data !== undefined ? response.data : response;
        const items = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : [];
        return {
          items,
          pagination: raw?.pagination ?? response?.pagination ?? null,
        };
      },
      serializeQueryArgs: ({ endpointName, queryArgs }) =>
        `${endpointName}-${queryArgs.leagueId}-${queryArgs.term || ''}-${
          queryArgs.positionId || ''
        }`,
      merge: (currentCache, newItems) => {
        const page = newItems.pagination?.currentPage ?? 1;
        if (page <= 1) {
          currentCache.items = newItems.items;
        } else {
          const existingIds = new Set(
            currentCache.items.map((i: any) => i._id || i.id),
          );
          const uniqueNewItems = (newItems.items || []).filter(
            (i: any) => !existingIds.has(i._id || i.id),
          );
          currentCache.items = [...currentCache.items, ...uniqueNewItems];
        }
        currentCache.pagination = newItems.pagination;
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.page !== previousArg?.page,
      providesTags: (result, error, { leagueId }) => [
        { type: 'League', id: leagueId },
      ],
    }),
    getAthletePositions: builder.query<
      { _id: string; code: string; name: string }[],
      void
    >({
      query: () => ({
        url: 'athlete-positions',
        params: { limit: 100 },
      }),
      transformResponse: (response: any) => {
        const raw = response?.data !== undefined ? response.data : response;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      },
    }),
    getSeasonAthleteDetails: builder.query<
      any,
      { seasonId: string; athleteId: string }
    >({
      query: ({ seasonId, athleteId }) => ({
        url: `seasons/${seasonId}/athletes/${athleteId}`,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
    }),
    getLeagueRosters: builder.query<any, string>({
      query: id => ({
        url: `leagues/${id}/rosters`,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: (result, error, id) => [{ type: 'League', id }],
    }),
    getScoringSettings: builder.query<ScoringSettings, string>({
      query: leagueId => ({ url: `leagues/${leagueId}/scoring-settings` }),
      transformResponse: (response: any) => response?.data || response,
      providesTags: (result, error, leagueId) => [
        { type: 'League', id: leagueId },
      ],
    }),
    removeLeagueMember: builder.mutation<
      void,
      { leagueId: string; userId: string }
    >({
      query: ({ leagueId, userId }) => ({
        url: `leagues/${leagueId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { leagueId }) => [
        { type: 'League', id: leagueId },
        'League',
      ],
    }),
    updateMemberRole: builder.mutation<
      any,
      { leagueId: string; userId: string; role: 'creator' | 'manager' }
    >({
      query: ({ leagueId, userId, role }) => ({
        url: `leagues/${leagueId}/members/${userId}/role`,
        method: 'PATCH',
        body: { role },
      }),
      transformResponse: (response: any) => response?.data || response,
      invalidatesTags: (result, error, { leagueId }) => [
        { type: 'League', id: leagueId },
        'League',
      ],
    }),
    getRosterSettings: builder.query<RosterSettings, string>({
      query: leagueId => ({
        url: `leagues/${leagueId}/roster-settings`,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: (result, error, leagueId) => [
        { type: 'League', id: leagueId },
      ],
    }),
    updateRosterSettings: builder.mutation<
      RosterSettings,
      UpdateRosterSettingsPayload
    >({
      query: ({ leagueId, ...body }) => ({
        url: `leagues/${leagueId}/roster-settings`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      invalidatesTags: (result, error, { leagueId }) => [
        { type: 'League', id: leagueId },
        'League',
      ],
    }),
    getDraftState: builder.query<DraftState, string>({
      query: leagueId => ({ url: `leagues/${leagueId}/draft` }),
      transformResponse: (response: any) => response?.data || response,
      providesTags: (result, error, leagueId) => [
        { type: 'League', id: leagueId },
      ],
    }),
    startDraft: builder.mutation<DraftState, string>({
      query: leagueId => ({
        url: `leagues/${leagueId}/draft/start`,
        method: 'POST',
      }),
      transformResponse: (response: any) => response?.data || response,
      invalidatesTags: (result, error, leagueId) => [
        { type: 'League', id: leagueId },
      ],
    }),
    getDraftPicks: builder.query<DraftPickRecord[], string>({
      query: leagueId => ({ url: `leagues/${leagueId}/draft/picks` }),
      transformResponse: (response: any) => {
        const raw = response?.data !== undefined ? response.data : response;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      },
      providesTags: (result, error, leagueId) => [
        { type: 'League', id: leagueId },
      ],
    }),
    getMyTeamRoster: builder.query<TeamRosterResponse, string>({
      query: leagueId => ({
        url: `leagues/${leagueId}/my-team/roster`,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: (result, error, leagueId) => [
        { type: 'League', id: leagueId },
      ],
    }),
    getTeamRoster: builder.query<
      TeamRosterResponse,
      { leagueId: string; teamId: string }
    >({
      query: ({ leagueId, teamId }) => ({
        url: `leagues/${leagueId}/teams/${teamId}/roster`,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: (result, error, { leagueId }) => [
        { type: 'League', id: leagueId },
      ],
    }),
    addFreeAgent: builder.mutation<
      any,
      { leagueId: string; teamId: string; seasonAthleteId: string }
    >({
      query: ({ leagueId, teamId, seasonAthleteId }) => ({
        url: `leagues/${leagueId}/teams/${teamId}/add-player`,
        method: 'POST',
        body: { seasonAthleteId },
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      invalidatesTags: (result, error, { leagueId }) => [
        { type: 'League', id: leagueId },
        'League',
      ],
    }),
    draftPick: builder.mutation<
      any,
      {
        leagueId: string;
        teamId: string;
        seasonAthleteId: string;
        acquisitionCost?: number;
      }
    >({
      query: ({ leagueId, teamId, seasonAthleteId, acquisitionCost = 0 }) => ({
        url: `leagues/${leagueId}/teams/${teamId}/draft-pick`,
        method: 'POST',
        body: { seasonAthleteId, acquisitionCost },
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      invalidatesTags: (result, error, { leagueId }) => [
        { type: 'League', id: leagueId },
        'League',
      ],
    }),
    updateLineup: builder.mutation<
      any,
      {
        leagueId: string;
        teamId: string;
        ownershipId: string;
        lineupStatus: 'starter' | 'bench';
        assignedPositionId?: string;
      }
    >({
      query: ({
        leagueId,
        teamId,
        ownershipId,
        lineupStatus,
        assignedPositionId,
      }) => ({
        url: `leagues/${leagueId}/teams/${teamId}/lineup`,
        method: 'PATCH',
        body: { ownershipId, lineupStatus, assignedPositionId },
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      invalidatesTags: (result, error, { leagueId }) => [
        { type: 'League', id: leagueId },
        'League',
      ],
    }),
    dropPlayer: builder.mutation<
      any,
      { leagueId: string; teamId: string; seasonAthleteId: string }
    >({
      query: ({ leagueId, teamId, seasonAthleteId }) => ({
        url: `leagues/${leagueId}/teams/${teamId}/drop-player`,
        method: 'POST',
        body: { seasonAthleteId },
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      invalidatesTags: (result, error, { leagueId }) => [
        { type: 'League', id: leagueId },
        'League',
      ],
    }),
    getCurrentMatchup: builder.query<any, CurrentMatchupQueryArg>({
      query: buildCurrentMatchupRequest,
      serializeQueryArgs: ({ queryArgs }) => currentMatchupCacheKey(queryArgs),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: (result, error, arg) => {
        const leagueId = typeof arg === 'string' ? arg : arg.leagueId;
        return [{ type: 'League', id: leagueId }, 'League'];
      },
    }),
    getLeagueStandings: builder.query<any, string>({
      query: leagueId => ({
        url: `leagues/${leagueId}/standings`,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: (result, error, leagueId) => [
        { type: 'League', id: leagueId },
      ],
    }),
    getMatchupHistory: builder.query<any, string>({
      query: leagueId => ({
        url: `leagues/${leagueId}/matchups/history`,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: (result, error, leagueId) => [
        { type: 'League', id: leagueId },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useCreateLeagueMutation,
  useUpdateLeagueMutation,
  useGetLeaguesQuery,
  useGetLeagueDetailsQuery,
  useJoinLeagueMutation,
  useJoinByCodeMutation,
  useGetLeagueMembersQuery,
  useGetAvailableAthletesQuery,
  useGetAthletePositionsQuery,
  useGetSeasonAthleteDetailsQuery,
  useGetLeagueRostersQuery,
  useGetScoringSettingsQuery,
  useRemoveLeagueMemberMutation,
  useUpdateMemberRoleMutation,
  useGetRosterSettingsQuery,
  useUpdateRosterSettingsMutation,
  useGetDraftStateQuery,
  useStartDraftMutation,
  useGetDraftPicksQuery,
  useGetMyTeamRosterQuery,
  useGetTeamRosterQuery,
  useAddFreeAgentMutation,
  useDraftPickMutation,
  useUpdateLineupMutation,
  useDropPlayerMutation,
  useGetCurrentMatchupQuery,
  useGetLeagueStandingsQuery,
  useGetMatchupHistoryQuery,
} = leagueApi;
