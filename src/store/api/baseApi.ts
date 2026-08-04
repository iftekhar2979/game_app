import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// You can update the baseUrl once you have a specific backend API running.
// Example: baseUrl: 'http://localhost:3000/api/'
import { RootState } from '../index';
import { API_URL } from '../../config';

export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: () => ({}),
});
