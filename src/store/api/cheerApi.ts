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
      { leagueId: string; seasonCheerTeamId: string }
    >({
      query: ({ leagueId, seasonCheerTeamId }) => ({
        url: `leagues/${leagueId}/draft/cheer-team-picks`,
        method: 'POST',
        body: { seasonCheerTeamId },
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
      { leagueId: string; fantasyTeamId: string; seasonCheerTeamId: string }
    >({
      query: ({ leagueId, fantasyTeamId, seasonCheerTeamId }) => ({
        url: `fantasy-cheer/leagues/${leagueId}/teams/${fantasyTeamId}/free-agents`,
        method: 'POST',
        body: { seasonCheerTeamId },
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
      any,
      {
        leagueId: string;
        fantasyTeamId: string;
        seasonCheerTeamId: string;
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
      invalidatesTags: ['Roster'],
    }),
    getCheerWaiverClaims: builder.query<
      any[],
      { leagueId: string; fantasyTeamId: string }
    >({
      query: ({ leagueId, fantasyTeamId }) =>
        `fantasy-cheer/leagues/${leagueId}/teams/${fantasyTeamId}/waiver-claims`,
      transformResponse: (response: any) => unwrap(response) ?? [],
      providesTags: ['Roster'],
    }),
    proposeCheerTrade: builder.mutation<
      any,
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
      invalidatesTags: ['Roster'],
    }),
    getCheerTrades: builder.query<any[], string>({
      query: leagueId => `fantasy-cheer/leagues/${leagueId}/trades`,
      transformResponse: (response: any) => unwrap(response) ?? [],
      providesTags: ['Roster'],
    }),
    respondToCheerTrade: builder.mutation<
      any,
      { leagueId: string; tradeId: string; accept: boolean }
    >({
      query: ({ leagueId, tradeId, accept }) => ({
        url: `fantasy-cheer/leagues/${leagueId}/trades/${tradeId}/respond`,
        method: 'POST',
        body: { accept },
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Roster'],
    }),
    voteOnCheerTrade: builder.mutation<
      any,
      { leagueId: string; tradeId: string; approve: boolean }
    >({
      query: ({ leagueId, tradeId, approve }) => ({
        url: `fantasy-cheer/leagues/${leagueId}/trades/${tradeId}/votes`,
        method: 'POST',
        body: { approve },
      }),
      transformResponse: unwrap,
      invalidatesTags: ['Roster'],
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
      { leagueId: string; seasonCheerTeamId: string; openingBid: number }
    >({
      query: ({ leagueId, ...body }) => ({
        url: `leagues/${leagueId}/auction/nominations`,
        method: 'POST',
        body,
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
  useGetAvailableCheerTeamsQuery,
  useDraftCheerTeamMutation,
  useGetFantasyCheerRosterQuery,
  useAddFantasyCheerFreeAgentMutation,
  useUpdateFantasyCheerLineupMutation,
  useReleaseFantasyCheerTeamMutation,
  useSubmitCheerWaiverClaimMutation,
  useGetCheerWaiverClaimsQuery,
  useProposeCheerTradeMutation,
  useGetCheerTradesQuery,
  useRespondToCheerTradeMutation,
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
