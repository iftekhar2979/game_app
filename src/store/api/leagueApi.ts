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
    }),
  }),
  overrideExisting: true,
});

export const { useCreateLeagueMutation } = leagueApi;

