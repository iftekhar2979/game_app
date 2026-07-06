import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// You can update the baseUrl once you have a specific backend API running.
// Example: baseUrl: 'http://localhost:3000/api/'
export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: () => ({}),
});
