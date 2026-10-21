import { baseApi } from './baseApi';

export interface CheerOrganization {
  _id?: string;
  id?: string;
  name?: string;
  shortName?: string;
  logoUrl?: string;
  country?: string;
  location?: string;
}

export interface CheerDivisionReference {
  _id?: string;
  id?: string;
  code?: string;
  name?: string;
}

export interface SeasonCheerTeam {
  _id: string;
  id?: string;
  seasonId: string;
  teamName: string;
  organizationId: CheerOrganization | string;
  eligibleDivisionIds: Array<CheerDivisionReference | string>;
  openingValue: number;
  isEligible: boolean;
}

export interface CheerCompetition {
  _id: string;
  id?: string;
  name: string;
  governingBody: string;
  venue?: string;
  startsAt: string;
  endsAt: string;
  fantasyPeriod: number;
  status: string;
  divisionIds: unknown[];
}

export type CheerTradeStatus =
  | 'proposed'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'vetoed'
  | 'completed'
  | 'expired';

/** One cheer team on either side of a trade, named by the server. */
export interface CheerTradeAsset {
  ownershipId: string;
  seasonCheerTeamId: string | null;
  name: string;
}

export interface CheerTrade {
  _id: string;
  leagueId: string;
  proposerFantasyTeamId: string;
  recipientFantasyTeamId: string;
  status: CheerTradeStatus;
  message?: string;
  expiresAt: string;
  reviewEndsAt?: string;
  resolvedAt?: string;
  createdAt: string;
  proposer: { fantasyTeamId: string; name: string };
  recipient: { fantasyTeamId: string; name: string };
  offered: CheerTradeAsset[];
  requested: CheerTradeAsset[];
  approvals: number;
  vetoes: number;
  viewerHasVoted: boolean;
}

export type CheerWaiverClaimStatus =
  | 'pending'
  | 'won'
  | 'lost'
  | 'cancelled'
  | 'failed';

export interface CheerWaiverClaim {
  _id: string;
  seasonCheerTeamId: string;
  seasonCheerTeamName: string;
  dropOwnershipId?: string;
  dropTeamName: string | null;
  bidAmount: number;
  status: CheerWaiverClaimStatus;
  processAfter: string;
  processedAt?: string;
  failureReason?: string;
  createdAt: string;
}

const unwrap = (response: any) => response?.data ?? response;

export const cheerApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getAvailableCheerTeams: builder.query<SeasonCheerTeam[], string>({
      query: leagueId => `fantasy-cheer/leagues/${leagueId}/available-teams`,
      transformResponse: (response: any) => {
        const value = unwrap(response);
        return Array.isArray(value) ? value : value?.data ?? [];
      },
      providesTags: (_result, _error, leagueId) => [
        { type: 'League', id: leagueId },
        'Draft',
      ],
    }),
    draftCheerTeam: builder.mutation<
      any,
      {
        leagueId: string;
        seasonCheerTeamId: string;
        /**
         * Omit to let the server choose the roster division. It picks the
         * division that would otherwise be hardest to fill, so a manager cannot
         * strand a slot by spending a multi-division team on the wrong one.
         */
        assignedDivisionId?: string;
      }
    >({
      query: ({ leagueId, ...body }) => ({
        url: `leagues/${leagueId}/draft/cheer-team-picks`,
        method: 'POST',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: (_result, _error, { leagueId }) => [
        { type: 'League', id: leagueId },
        'Draft',
        'Roster',
      ],
    }),
    getFantasyCheerRoster: builder.query<
      any,
      { leagueId: string; fantasyTeamId: string }
    >({
      query: ({ leagueId, fantasyTeamId }) =>
        `fantasy-cheer/leagues/${leagueId}/teams/${fantasyTeamId}/roster`,
      transformResponse: (response: any) => unwrap(response),
      providesTags: ['Roster'],
    }),
    addFantasyCheerFreeAgent: builder.mutation<
      any,
      { leagueId: string; fantasyTeamId: string; seasonCheerTeamId: string; assignedDivisionId: string }
    >({
      query: ({ leagueId, fantasyTeamId, ...body }) => ({
        url: `fantasy-cheer/leagues/${leagueId}/teams/${fantasyTeamId}/free-agents`,
        method: 'POST',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: (_result, _error, { leagueId }) => [
        { type: 'League', id: leagueId },
        'Roster',
      ],
    }),
    updateFantasyCheerLineup: builder.mutation<
      any,
      {
        leagueId: string;
        fantasyTeamId: string;
        ownershipId: string;
        lineupStatus: 'starter' | 'bench';
      }
    >({
      query: ({ leagueId, fantasyTeamId, ...body }) => ({
        url: `fantasy-cheer/leagues/${leagueId}/teams/${fantasyTeamId}/lineup`,
        method: 'PATCH',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Roster', 'Matchup'],
    }),
    releaseFantasyCheerTeam: builder.mutation<
      any,
      { leagueId: string; fantasyTeamId: string; ownershipId: string }
    >({
      query: ({ leagueId, fantasyTeamId, ownershipId }) => ({
        url: `fantasy-cheer/leagues/${leagueId}/teams/${fantasyTeamId}/roster/${ownershipId}/release`,
        method: 'POST',
      }),
      transformResponse: unwrap,
      invalidatesTags: (_result, _error, { leagueId }) => [
        { type: 'League', id: leagueId },
        'Roster',
      ],
    }),
    submitCheerWaiverClaim: builder.mutation<
      CheerWaiverClaim,
      {
        leagueId: string;
        fantasyTeamId: string;
        seasonCheerTeamId: string;
        assignedDivisionId: string;
        dropOwnershipId?: string;
        bidAmount: number;
      }
    >({
      query: ({ leagueId, fantasyTeamId, ...body }) => ({
        url: `fantasy-cheer/leagues/${leagueId}/teams/${fantasyTeamId}/waiver-claims`,
        method: 'POST',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Waiver'],
    }),
    getCheerWaiverClaims: builder.query<
      CheerWaiverClaim[],
      { leagueId: string; fantasyTeamId: string }
    >({
      query: ({ leagueId, fantasyTeamId }) =>
        `fantasy-cheer/leagues/${leagueId}/teams/${fantasyTeamId}/waiver-claims`,
      transformResponse: (response: any) => unwrap(response) ?? [],
      providesTags: ['Waiver'],
    }),
    /** Commissioner only: settles every claim whose clearing period is over. */
    processCheerWaivers: builder.mutation<
      Array<{ claimId: string; status: CheerWaiverClaimStatus; reason?: string }>,
      string
    >({
      query: leagueId => ({
        url: `fantasy-cheer/leagues/${leagueId}/waivers/process`,
        method: 'POST',
      }),
      transformResponse: (response: any) => unwrap(response) ?? [],
      invalidatesTags: (_result, _error, leagueId) => [
        { type: 'League', id: leagueId },
        'Waiver',
        'Roster',
      ],
    }),
    proposeCheerTrade: builder.mutation<
      CheerTrade,
      {
        leagueId: string;
        fantasyTeamId: string;
        recipientFantasyTeamId: string;
        offeredOwnershipIds: string[];
        requestedOwnershipIds: string[];
        message?: string;
      }
    >({
      query: ({ leagueId, fantasyTeamId, ...body }) => ({
        url: `fantasy-cheer/leagues/${leagueId}/teams/${fantasyTeamId}/trades`,
        method: 'POST',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Trade'],
    }),
    getCheerTrades: builder.query<CheerTrade[], string>({
      query: leagueId => `fantasy-cheer/leagues/${leagueId}/trades`,
      transformResponse: (response: any) => unwrap(response) ?? [],
      providesTags: ['Trade'],
    }),
    respondToCheerTrade: builder.mutation<
      CheerTrade,
      { leagueId: string; tradeId: string; accept: boolean }
    >({
      query: ({ leagueId, tradeId, accept }) => ({
        url: `fantasy-cheer/leagues/${leagueId}/trades/${tradeId}/respond`,
        method: 'POST',
        body: { accept },
      }),
      transformResponse: unwrap,
      // An instant-review league executes the trade on accept.
      invalidatesTags: ['Trade', 'Roster'],
    }),
    cancelCheerTrade: builder.mutation<
      CheerTrade,
      { leagueId: string; tradeId: string }
    >({
      query: ({ leagueId, tradeId }) => ({
        url: `fantasy-cheer/leagues/${leagueId}/trades/${tradeId}/cancel`,
        method: 'POST',
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Trade'],
    }),
    /** Commissioner-veto leagues: the creator approves or vetoes an accepted trade. */
    resolveCheerTrade: builder.mutation<
      CheerTrade,
      { leagueId: string; tradeId: string; approve: boolean }
    >({
      query: ({ leagueId, tradeId, approve }) => ({
        url: `fantasy-cheer/leagues/${leagueId}/trades/${tradeId}/resolve`,
        method: 'POST',
        body: { approve },
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Trade', 'Roster'],
    }),
    voteOnCheerTrade: builder.mutation<
      CheerTrade,
      { leagueId: string; tradeId: string; approve: boolean }
    >({
      query: ({ leagueId, tradeId, approve }) => ({
        url: `fantasy-cheer/leagues/${leagueId}/trades/${tradeId}/votes`,
        method: 'POST',
        body: { approve },
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Trade', 'Roster'],
    }),
    finalizeCheerFantasyPeriod: builder.mutation<
      any,
      { leagueId: string; period: number }
    >({
      query: ({ leagueId, period }) => ({
        url: `leagues/${leagueId}/matchups/finalize-period`,
        method: 'POST',
        body: { period },
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Roster', 'Matchup', 'League'],
    }),
    getCheerCompetitions: builder.query<
      CheerCompetition[],
      { seasonId?: string; fantasyPeriod?: number; status?: string }
    >({
      query: params => ({ url: 'events', params }),
      transformResponse: (response: any) => unwrap(response) ?? [],
      providesTags: ['Game'],
    }),
    getCheerCompetitionResults: builder.query<
      any[],
      { competitionId: string; divisionId?: string; round?: string }
    >({
      query: ({ competitionId, ...params }) => ({
        url: `events/${competitionId}/results`,
        params,
      }),
      transformResponse: (response: any) => unwrap(response) ?? [],
      providesTags: ['Game'],
    }),
    getCheerEvent: builder.query<any, string>({
      query: eventId => `events/${eventId}`,
      transformResponse: (response: any) => unwrap(response),
      providesTags: (_result, _error, eventId) => [
        { type: 'Game', id: eventId },
      ],
    }),
    getCheerEventEntries: builder.query<any[], string>({
      query: eventId => `events/${eventId}/entries`,
      transformResponse: (response: any) => unwrap(response) ?? [],
      providesTags: (_result, _error, eventId) => [
        { type: 'Game', id: eventId },
      ],
    }),
    getCheerAuction: builder.query<any, string>({
      query: leagueId => `leagues/${leagueId}/auction`,
      transformResponse: unwrap,
      providesTags: ['Draft'],
    }),
    startCheerAuction: builder.mutation<any, string>({
      query: leagueId => ({
        url: `leagues/${leagueId}/auction/start`,
        method: 'POST',
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Draft'],
    }),
    nominateCheerTeam: builder.mutation<
      any,
      { leagueId: string; seasonCheerTeamId: string; assignedDivisionId: string; openingBid: number }
    >({
      query: ({ leagueId, ...body }) => ({
        url: `leagues/${leagueId}/auction/nominations`,
        method: 'POST',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Draft'],
    }),
    // Commissioner-only. The server refuses a non-creator, a league that is
    // not running its auction, and an open nomination with live bids.
    skipCheerNomination: builder.mutation<any, string>({
      query: leagueId => ({
        url: `leagues/${leagueId}/auction/nominations/skip`,
        method: 'POST',
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Draft'],
    }),
    bidOnCheerTeam: builder.mutation<
      any,
      { leagueId: string; turnId: string; requestId: string; amount: number }
    >({
      query: ({ leagueId, turnId, ...body }) => ({
        url: `leagues/${leagueId}/auction/turns/${turnId}/bids`,
        method: 'POST',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Draft'],
    }),
    finalizeCheerAuctionTurn: builder.mutation<
      any,
      { leagueId: string; turnId: string }
    >({
      query: ({ leagueId, turnId }) => ({
        url: `leagues/${leagueId}/auction/turns/${turnId}/finalize`,
        method: 'POST',
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Draft', 'Roster'],
    }),
    completeCheerAuction: builder.mutation<any, string>({
      query: leagueId => ({
        url: `leagues/${leagueId}/auction/complete`,
        method: 'POST',
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Draft', 'Roster', 'League'],
    }),
  }),
});

export const {
  useSkipCheerNominationMutation,
  useGetAvailableCheerTeamsQuery,
  useDraftCheerTeamMutation,
  useGetFantasyCheerRosterQuery,
  useAddFantasyCheerFreeAgentMutation,
  useUpdateFantasyCheerLineupMutation,
  useReleaseFantasyCheerTeamMutation,
  useSubmitCheerWaiverClaimMutation,
  useGetCheerWaiverClaimsQuery,
  useProcessCheerWaiversMutation,
  useProposeCheerTradeMutation,
  useGetCheerTradesQuery,
  useRespondToCheerTradeMutation,
  useCancelCheerTradeMutation,
  useResolveCheerTradeMutation,
  useVoteOnCheerTradeMutation,
  useFinalizeCheerFantasyPeriodMutation,
  useGetCheerCompetitionsQuery,
  useGetCheerCompetitionResultsQuery,
  useGetCheerEventQuery,
  useGetCheerEventEntriesQuery,
  useGetCheerAuctionQuery,
  useStartCheerAuctionMutation,
  useNominateCheerTeamMutation,
  useBidOnCheerTeamMutation,
  useFinalizeCheerAuctionTurnMutation,
  useCompleteCheerAuctionMutation,
} = cheerApi;
