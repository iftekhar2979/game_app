import { baseApi } from './baseApi';

export type DfsContestStatus =
  | 'upcoming'
  | 'open'
  | 'locked'
  | 'live'
  | 'settled'
  | 'cancelled';

export interface DfsLineupSlotConfig {
  slot: string;
  positionCodes: string[];
  count: number;
}

export interface DfsContest {
  id?: string;
  _id?: string;
  title: string;
  type: 'free' | 'gpp';
  entryFee: number;
  maxEntrants: number;
  entrantCount: number;
  lineupSlots: DfsLineupSlotConfig[];
  salaryCap: number;
  lockTime: string;
  status: DfsContestStatus;
  eventId?:
    | string
    | {
        id?: string;
        _id?: string;
        name?: string;
        venue?: string;
        startsAt?: string;
        endsAt?: string;
        status?: string;
      };
}

export interface DfsSeasonAthlete {
  id?: string;
  _id?: string;
  athleteId?:
    | string
    | {
        id?: string;
        _id?: string;
        displayName?: string;
        firstName?: string;
        lastName?: string;
        photoUrl?: string;
        status?: string;
      };
  eligiblePositionIds?: Array<
    string | { id?: string; _id?: string; code?: string; name?: string }
  >;
  organizationId?: string | { id?: string; _id?: string; name?: string };
}

export interface DfsSlateAthlete {
  seasonAthleteId: string | DfsSeasonAthlete;
  salary: number;
  projectedPoints: number;
  isLocked: boolean;
}

export interface DfsSlate {
  id?: string;
  _id?: string;
  contestId: string;
  athleteSlates: DfsSlateAthlete[];
}

export interface DfsLineupPayloadItem {
  slot: string;
  seasonAthleteId: string;
}

export interface DfsEntryLineupItem extends DfsLineupPayloadItem {
  salary?: number;
}

export interface DfsEntry {
  id?: string;
  _id?: string;
  contestId: string;
  userId: string;
  lineup: DfsEntryLineupItem[];
  totalSalaryUsed: number;
  status: string;
  updatedAt?: string;
}

interface ApiEnvelope<T> {
  data: T;
  pagination?: unknown;
}

export interface DfsContestPage {
  data: DfsContest[];
  pagination?: unknown;
}

const unwrap = <T>(response: ApiEnvelope<T> | T): T => {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as ApiEnvelope<T>).data;
  }
  return response as T;
};

export const dfsApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getDfsContests: builder.query<DfsContestPage, void>({
      query: () => ({ url: 'dfs/contests' }),
      transformResponse: (response: ApiEnvelope<DfsContest[]>) => ({
        data: response?.data ?? [],
        pagination: response?.pagination,
      }),
      providesTags: ['DfsContest'],
    }),
    getDfsContest: builder.query<DfsContest, string>({
      query: contestId => ({ url: `dfs/contests/${contestId}` }),
      transformResponse: unwrap<DfsContest>,
      providesTags: (result, error, contestId) => [
        { type: 'DfsContest', id: contestId },
      ],
    }),
    getContestSlate: builder.query<DfsSlate, string>({
      query: contestId => ({ url: `dfs/contests/${contestId}/slate` }),
      transformResponse: unwrap<DfsSlate>,
      providesTags: (result, error, contestId) => [
        { type: 'DfsSlate', id: contestId },
      ],
    }),
    getMyDfsEntry: builder.query<DfsEntry, string>({
      query: contestId => ({ url: `dfs/contests/${contestId}/my-entry` }),
      transformResponse: unwrap<DfsEntry>,
      providesTags: (result, error, contestId) => [
        { type: 'DfsEntry', id: contestId },
      ],
    }),
    createDfsEntry: builder.mutation<
      DfsEntry,
      { contestId: string; lineup: DfsLineupPayloadItem[] }
    >({
      query: ({ contestId, lineup }) => ({
        url: `dfs/contests/${contestId}/entries`,
        method: 'POST',
        body: { lineup },
      }),
      transformResponse: unwrap<DfsEntry>,
      invalidatesTags: (result, error, { contestId }) => [
        { type: 'DfsEntry', id: contestId },
        { type: 'DfsContest', id: contestId },
        'DfsContest',
      ],
    }),
    updateMyDfsLineup: builder.mutation<
      DfsEntry,
      { contestId: string; lineup: DfsLineupPayloadItem[] }
    >({
      query: ({ contestId, lineup }) => ({
        url: `dfs/contests/${contestId}/my-entry/lineup`,
        method: 'PATCH',
        body: { lineup },
      }),
      transformResponse: unwrap<DfsEntry>,
      invalidatesTags: (result, error, { contestId }) => [
        { type: 'DfsEntry', id: contestId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDfsContestsQuery,
  useGetDfsContestQuery,
  useGetContestSlateQuery,
  useGetMyDfsEntryQuery,
  useCreateDfsEntryMutation,
  useUpdateMyDfsLineupMutation,
} = dfsApi;
