import { baseApi } from './baseApi';

export const usersApi = baseApi.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    updateMe: builder.mutation<any, {
      avatarUrl?: string;
      avatarConfig?: Record<string, any>;
      fullName?: string;
      username?: string;
    }>({
      query: (data) => ({
        url: '/users/me',
        method: 'PATCH',
        body: data,
      }),
    }),
    getMe: builder.query<any, void>({
      query: () => ({
        url: '/users/me',
        method: 'GET',
      }),
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

export const { useUpdateMeMutation, useGetMeQuery, useLazyGetPreSignedUrlQuery } = usersApi;
