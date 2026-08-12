import { baseApi } from './baseApi';

export interface Season {
  _id: string;
  name: string;
  status: string;
  registrationStartsAt: string;
  registrationEndsAt: string;
  startsAt: string;
  endsAt: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  status: number;
  message: string;
  data: T;
}

export const seasonApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getActiveSeasons: builder.query<Season[], void>({
      query: () => 'seasons/active',
      transformResponse: (response: any) => {
        const raw = response?.data !== undefined ? response.data : response;
        if (Array.isArray(raw)) {
          return raw;
        }
        if (Array.isArray(raw?.items)) {
          return raw.items;
        }
        if (Array.isArray(raw?.data)) {
          return raw.data;
        }
        return [];
      },
    }),

  }),
  overrideExisting: true,
});

export const { useGetActiveSeasonsQuery } = seasonApi;

