import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserProfile {
  username?: string;
  email?: string;
  dateOfBirth?: string;
  name?: string;
  fullName?: string;
  avatarUrl?: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isInitializing: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: UserProfile; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isInitializing = false;
    },
    updateUser: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      } else {
        state.user = action.payload as UserProfile;
      }
    },
    setInitializing: (state, action: PayloadAction<boolean>) => {
      state.isInitializing = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isInitializing = false;
    },
  },
});

export const { setCredentials, logout, updateUser, setInitializing } = authSlice.actions;
export default authSlice.reducer;
