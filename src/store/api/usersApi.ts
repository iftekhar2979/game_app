import { baseApi } from './baseApi';
import {
  organizationQueryParams,
  toOrganizationSummaries,
  type OrganizationSummary,
} from './favoriteOrganizations';

export type {
  FavoriteField,
  OrganizationSummary,
} from './favoriteOrganizations';

export const usersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    updateMe: builder.mutation<any, {
      avatarUrl?: string;
      avatarConfig?: Record<string, any>;
      fullName?: string;
      username?: string;
      /**
       * Organization ids, or `null` to clear one.
       *
       * `null` is a real value here rather than an omission: omitting the field
       * leaves the favourite alone, which is how every other partial update
       * behaves, so there would otherwise be no way to un-set one.
       */
      favoriteOrganizationId?: string | null;
      favoriteTeamId?: string | null;
    }>({
      query: (data) => ({
        url: '/users/me',
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: any) => response?.data ?? response,
      invalidatesTags: ['User'],
    }),
    getMe: builder.query<any, void>({
      query: () => ({
        url: '/users/me',
        method: 'GET',
      }),
      transformResponse: (response: any) => response?.data ?? response,
      providesTags: ['User'],
    }),
    /**
     * Organizations for the favourite gym and team pickers.
     *
     * Searched and capped server-side: the full list is unbounded and this runs
     * on a phone. An empty term returns the first page alphabetically, which is
     * what the picker shows before anyone types.
     */
    getOrganizations: builder.query<OrganizationSummary[], { search?: string; limit?: number } | void>({
      query: (args) => ({
        url: '/events/organizations',
        method: 'GET',
        params: organizationQueryParams(args || undefined),
      }),
      transformResponse: toOrganizationSummaries,
    }),

    getPreSignedUrl: builder.query<{ message: string; data: { url: string; key: string; method: string } }, { fileName: string; primaryPath: string; expiresIn: string }>({
      query: (params) => ({
        url: '/s3/pre-signed-url',
        method: 'GET',
        params,
      }),
    }),
  }),
});

export const {
  useUpdateMeMutation,
  useGetMeQuery,
  useGetOrganizationsQuery,
  useLazyGetPreSignedUrlQuery,
} = usersApi;
