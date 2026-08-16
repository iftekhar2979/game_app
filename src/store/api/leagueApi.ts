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
  }),
  overrideExisting: true,
});

export const {
  useCreateLeagueMutation,
  useGetLeaguesQuery,
  useGetLeagueDetailsQuery,
  useJoinLeagueMutation,
  useGetLeagueMembersQuery,
} = leagueApi;


