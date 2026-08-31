import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query';
import { Mutex } from 'async-mutex';
import { API_URL } from '../../config';
import { authStorage } from '../../services/authStorage';
import { logout, setCredentials } from '../slices/authSlice';

const mutex = new Mutex();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: async (headers, { getState }) => {
    // 1. Check Redux state first, then fallback to Keychain / AuthStorage
    const state: any = getState();
    const token = state?.auth?.token || (await authStorage.getAccessToken());
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Wait until the mutex is unlocked (if another request is already refreshing)
  await mutex.waitForUnlock();

  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        const refreshToken = await authStorage.getRefreshToken();
        if (refreshToken) {
          // Call backend refresh-token endpoint
          const refreshResult = await rawBaseQuery(
            {
              url: 'auth/refresh-token',
              method: 'POST',
              body: { refreshToken },
            },
            api,
            extraOptions,
          );

          if (refreshResult.data) {
            const data: any =
              (refreshResult.data as any).data || refreshResult.data;
            const newAccessToken = data.accessToken;
            const newRefreshToken = data.refreshToken || refreshToken;

            if (newAccessToken) {
              // Save new token(s) securely in Keychain
              await authStorage.saveTokens(newAccessToken, newRefreshToken);

              // Update Redux state
              const user = (await authStorage.getUser()) || {};
              api.dispatch(setCredentials({ user, token: newAccessToken }));

              // Retry original failed request with new access token
              result = await rawBaseQuery(args, api, extraOptions);
            }
          }
        }
      } finally {
        release();
      }
    } else {
      // If mutex was locked, wait for it to release and retry with new token
      await mutex.waitForUnlock();
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  // A request that is still unauthorized after the refresh attempt cannot use
  // the current navigation tree. Clear it once and let the auth navigator open
  // directly on Sign In.
  if (result.error && result.error.status === 401) {
    await authStorage.clearSession();
    api.dispatch(logout());
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Auth',
    'User',
    'League',
    'Team',
    'Game',
    'Player',
    'Draft',
    'Roster',
    'Matchup',
    'Social',
    'Avatar',
    'AvatarAsset',
    'DfsContest',
    'DfsSlate',
    'DfsEntry',
    'AdminCheer',
    'Wallet',
    'CoinPackage',
  ],
  endpoints: () => ({}),
});
