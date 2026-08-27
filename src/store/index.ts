import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/baseApi';
import authReducer from './slices/authSlice';
import avatarReducer from './slices/avatarSlice';
import leagueReducer from './slices/leagueSlice';
import postReducer from './slices/postSlice';
// Import injected APIs just so they attach to baseApi
import './api/seasonApi';
import './api/leagueApi';
import './api/socialApi';
import './api/avatarApi';
import './api/dfsApi';
import './api/adminCheerApi';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
    auth: authReducer,
    avatar: avatarReducer,
    league: leagueReducer,
    post: postReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
