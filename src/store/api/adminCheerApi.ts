import { baseApi } from './baseApi';

const unwrap = (response: any) => response?.data ?? response;

export interface AdminCheerDashboard {
  scope: { seasonId: string | null };
  counts: {
    competitions?: number;
    seasonTeams?: number;
    teams?: number;
    divisions?: number;
    unpublishedScores?: number;
    [key: string]: number | undefined;
  };
  statusCounts: {
    competitions: Record<string, number>;
    entries: Record<string, number>;
    performances: Record<string, number>;
  };
  referenceData: { seasons: any[]; organizations: any[] };
  recentCompetitions: any[];
  scoringQueue: any[];
}

export const adminCheerApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getAdminCheerDashboard: builder.query<
      AdminCheerDashboard,
      string | undefined
    >({
      query: seasonId => ({
        url: 'admin/cheer/dashboard',
        params: seasonId ? { seasonId } : {},
      }),
      transformResponse: unwrap,
      providesTags: ['AdminCheer'],
    }),
    getAdminCheerDivisions: builder.query<any[], string>({
      query: seasonId => ({ url: 'cheer/divisions', params: { seasonId } }),
      transformResponse: (response: any) => unwrap(response) ?? [],
      providesTags: ['AdminCheer'],
    }),
    getAdminCheerCompetitions: builder.query<any[], string>({
      query: seasonId => ({
        url: 'admin/cheer/competitions',
        params: { seasonId },
      }),
      transformResponse: (response: any) => unwrap(response) ?? [],
      providesTags: ['AdminCheer'],
    }),
    getAdminCompetitionEntries: builder.query<any[], string>({
      query: competitionId => `events/${competitionId}/entries`,
      transformResponse: (response: any) => unwrap(response) ?? [],
      providesTags: ['AdminCheer'],
    }),
    createAdminSeason: builder.mutation<any, any>({
      query: body => ({ url: 'seasons', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminCheer'],
    }),
    createAdminOrganization: builder.mutation<any, any>({
      query: body => ({ url: 'events/organizations', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminCheer'],
    }),
    createAdminCheerDivision: builder.mutation<any, any>({
      query: body => ({ url: 'cheer/divisions', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminCheer'],
    }),
    createAdminCheerCompetition: builder.mutation<any, any>({
      query: body => ({ url: 'events', method: 'POST', body }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminCheer'],
    }),
    createAdminSeasonCheerTeam: builder.mutation<any, any>({
      query: body => ({
        url: 'fantasy-cheer/season-teams',
        method: 'POST',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminCheer'],
    }),
    registerAdminCompetitionEntry: builder.mutation<
      any,
      { competitionId: string; body: any }
    >({
      query: ({ competitionId, body }) => ({
        url: `events/${competitionId}/entries`,
        method: 'POST',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminCheer'],
    }),
    scoreAdminCheerPerformance: builder.mutation<
      any,
      { entryId: string; body: any }
    >({
      query: ({ entryId, body }) => ({
        url: `events/entries/${entryId}/performances`,
        method: 'POST',
        body,
      }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminCheer'],
    }),
    publishAdminCheerPerformance: builder.mutation<any, string>({
      query: performanceId => ({
        url: `events/performances/${performanceId}/publish`,
        method: 'POST',
      }),
      transformResponse: unwrap,
      invalidatesTags: [
        'AdminCheer',
        'Game',
        'League',
        'Matchup',
        'Roster',
      ],
    }),
    updateAdminCompetitionStatus: builder.mutation<
      any,
      { competitionId: string; status: string }
    >({
      query: ({ competitionId, status }) => ({
        url: `events/${competitionId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminCheer', 'Game'],
    }),
    updateAdminCheerSeasonStatus: builder.mutation<
      any,
      { seasonId: string; status: string }
    >({
      query: ({ seasonId, status }) => ({
        url: `admin/cheer/seasons/${seasonId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminCheer', 'League'],
    }),
    updateAdminEntryStatus: builder.mutation<
      any,
      { entryId: string; status: string }
    >({
      query: ({ entryId, status }) => ({
        url: `admin/cheer/entries/${entryId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      transformResponse: unwrap,
      invalidatesTags: ['AdminCheer'],
    }),
  }),
});

export const {
  useGetAdminCheerDashboardQuery,
  useGetAdminCheerDivisionsQuery,
  useGetAdminCheerCompetitionsQuery,
  useGetAdminCompetitionEntriesQuery,
  useCreateAdminSeasonMutation,
  useCreateAdminOrganizationMutation,
  useCreateAdminCheerDivisionMutation,
  useCreateAdminCheerCompetitionMutation,
  useCreateAdminSeasonCheerTeamMutation,
  useRegisterAdminCompetitionEntryMutation,
  useScoreAdminCheerPerformanceMutation,
  usePublishAdminCheerPerformanceMutation,
  useUpdateAdminCompetitionStatusMutation,
  useUpdateAdminCheerSeasonStatusMutation,
  useUpdateAdminEntryStatusMutation,
} = adminCheerApi;
