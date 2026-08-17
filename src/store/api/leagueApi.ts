import { baseApi } from './baseApi';

export interface DraftSettingsPayload {
  type: 'auction' | 'snake' | 'random';
  orderStrategy: 'random' | 'manual';
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

export interface JoinLeaguePayload {
  id: string;
  fantasyTeamName: string;
}

export const leagueApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createLeague: builder.mutation<LeagueResponse, CreateLeaguePayload>({
      query: (body) => ({
        url: 'leagues',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponse<LeagueResponse> | LeagueResponse) => {
        if ('data' in response && response.data) {
          return response.data;
        }
        return response as LeagueResponse;
      },
      invalidatesTags: ['League'],
    }),
    updateLeague: builder.mutation<any, { id: string; maxTeams?: number; status?: string; name?: string }>({
      query: ({ id, ...body }) => ({
        url: `leagues/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: any) => response?.data || response,
      invalidatesTags: (result, error, { id }) => [{ type: 'League', id }, 'League'],
    }),
    getLeagues: builder.query<LeagueItem[], { mine?: boolean } | void>({
      query: (params) => ({
        url: 'leagues',
        params: params ? { mine: params.mine } : {},
      }),
      transformResponse: (response: any) => {
        const raw = response?.data !== undefined ? response.data : response;
        if (Array.isArray(raw)) return raw;
        if (Array.isArray(raw?.data)) return raw.data;
        return [];
      },
      providesTags: ['League'],
    }),
    getLeagueDetails: builder.query<any, string>({
      query: (id) => ({
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
      invalidatesTags: (result, error, { id }) => [{ type: 'League', id }, 'League'],
    }),
    getLeagueMembers: builder.query<any, string>({
      query: (id) => ({
        url: `leagues/${id}/members`,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: (result, error, id) => [{ type: 'League', id }],
    }),
    getAvailableAthletes: builder.query<any, string>({
      query: (id) => ({
        url: `leagues/${id}/available-athletes`,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: (result, error, id) => [{ type: 'League', id }],
    }),
    getSeasonAthleteDetails: builder.query<any, { seasonId: string; athleteId: string }>({
      query: ({ seasonId, athleteId }) => ({
        url: `seasons/${seasonId}/athletes/${athleteId}`,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
    }),
    getLeagueRosters: builder.query<any, string>({
      query: (id) => ({
        url: `leagues/${id}/rosters`,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: (result, error, id) => [{ type: 'League', id }],
    }),
    addFreeAgent: builder.mutation<any, { leagueId: string; teamId: string; seasonAthleteId: string }>({
      query: ({ leagueId, teamId, seasonAthleteId }) => ({
        url: `leagues/${leagueId}/teams/${teamId}/add-player`,
        method: 'POST',
        body: { seasonAthleteId },
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      invalidatesTags: (result, error, { leagueId }) => [{ type: 'League', id: leagueId }, 'League'],
    }),
    draftPick: builder.mutation<any, { leagueId: string; teamId: string; seasonAthleteId: string; acquisitionCost?: number }>({
      query: ({ leagueId, teamId, seasonAthleteId, acquisitionCost = 0 }) => ({
        url: `leagues/${leagueId}/teams/${teamId}/draft-pick`,
        method: 'POST',
        body: { seasonAthleteId, acquisitionCost },
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      invalidatesTags: (result, error, { leagueId }) => [{ type: 'League', id: leagueId }, 'League'],
    }),
    updateLineup: builder.mutation<any, { leagueId: string; teamId: string; ownershipId: string; lineupStatus: 'starter' | 'bench'; assignedPositionId?: string }>({
      query: ({ leagueId, teamId, ownershipId, lineupStatus, assignedPositionId }) => ({
        url: `leagues/${leagueId}/teams/${teamId}/lineup`,
        method: 'PATCH',
        body: { ownershipId, lineupStatus, assignedPositionId },
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      invalidatesTags: (result, error, { leagueId }) => [{ type: 'League', id: leagueId }, 'League'],
    }),
    dropPlayer: builder.mutation<any, { leagueId: string; teamId: string; seasonAthleteId: string }>({
      query: ({ leagueId, teamId, seasonAthleteId }) => ({
        url: `leagues/${leagueId}/teams/${teamId}/drop-player`,
        method: 'POST',
        body: { seasonAthleteId },
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      invalidatesTags: (result, error, { leagueId }) => [{ type: 'League', id: leagueId }, 'League'],
    }),
    getCurrentMatchup: builder.query<any, string>({
      query: (leagueId) => ({
        url: `leagues/${leagueId}/matchups/current`,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: (result, error, leagueId) => [{ type: 'League', id: leagueId }, 'League'],
    }),
    getLeagueStandings: builder.query<any, string>({
      query: (leagueId) => ({
        url: `leagues/${leagueId}/standings`,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: (result, error, leagueId) => [{ type: 'League', id: leagueId }],
    }),
    getMatchupHistory: builder.query<any, string>({
      query: (leagueId) => ({
        url: `leagues/${leagueId}/matchups/history`,
      }),
      transformResponse: (response: any) => {
        return response?.data || response;
      },
      providesTags: (result, error, leagueId) => [{ type: 'League', id: leagueId }],
    }),
  }),
  overrideExisting: true,
});

export const {
  useCreateLeagueMutation,
  useGetLeaguesQuery,
  useGetLeagueDetailsQuery,
  useJoinLeagueMutation,
  useGetLeagueMembersQuery,
  useGetAvailableAthletesQuery,
  useGetSeasonAthleteDetailsQuery,
  useGetLeagueRostersQuery,
  useAddFreeAgentMutation,
  useDraftPickMutation,
  useUpdateLineupMutation,
  useDropPlayerMutation,
  useGetCurrentMatchupQuery,
  useGetLeagueStandingsQuery,
  useGetMatchupHistoryQuery,
} = leagueApi;




