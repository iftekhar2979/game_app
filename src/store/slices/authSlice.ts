import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserProfile {
  username?: string;
  email?: string;
  dateOfBirth?: string;
  name?: string;
  fullName?: string;
  avatarUrl?: string;
  isEmailVerified?: boolean;
  needsAvatarSetup?: boolean;
  role?: 'admin' | 'user' | string;
}

export type PendingAuthFlow = 'emailVerification' | 'passwordReset';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  pendingAuthFlow: PendingAuthFlow | null;
  pendingEmail: string | null;
  resetPasswordToken: string | null;
  signedOutRoute: 'Onboarding1' | 'SignIn';
  needsAvatarSetup: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isInitializing: true,
  pendingAuthFlow: null,
  pendingEmail: null,
  resetPasswordToken: null,
  signedOutRoute: 'Onboarding1',
  needsAvatarSetup: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: UserProfile; token: string }>,
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isInitializing = false;
      state.pendingAuthFlow = null;
      state.pendingEmail = null;
      state.resetPasswordToken = null;
      state.signedOutRoute = 'SignIn';
      state.needsAvatarSetup = Boolean(action.payload.user.needsAvatarSetup);
    },
    startEmailVerification: (
      state,
      action: PayloadAction<{ user: UserProfile; token: string }>,
    ) => {
      state.user = { ...action.payload.user, isEmailVerified: false };
      state.token = action.payload.token;
      state.isAuthenticated = false;
      state.isInitializing = false;
      state.pendingAuthFlow = 'emailVerification';
      state.pendingEmail = action.payload.user.email || null;
      state.resetPasswordToken = null;
      state.signedOutRoute = 'SignIn';
      state.needsAvatarSetup = false;
    },
    startPasswordReset: (
      state,
      action: PayloadAction<{ email: string; token: string }>,
    ) => {
      state.user = null;
      state.token = action.payload.token;
      state.isAuthenticated = false;
      state.isInitializing = false;
      state.pendingAuthFlow = 'passwordReset';
      state.pendingEmail = action.payload.email;
      state.resetPasswordToken = null;
      state.signedOutRoute = 'SignIn';
      state.needsAvatarSetup = false;
    },
    completeEmailVerification: state => {
      if (!state.token) return;
      state.user = {
        ...(state.user || {}),
        isEmailVerified: true,
        needsAvatarSetup: true,
      };
      state.isAuthenticated = true;
      state.pendingAuthFlow = null;
      state.pendingEmail = null;
      state.resetPasswordToken = null;
      state.needsAvatarSetup = true;
    },
    setResetPasswordToken: (state, action: PayloadAction<string>) => {
      state.resetPasswordToken = action.payload;
    },
    finishAvatarSetup: state => {
      state.needsAvatarSetup = false;
      if (state.user) state.user.needsAvatarSetup = false;
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
    logout: state => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isInitializing = false;
      state.pendingAuthFlow = null;
      state.pendingEmail = null;
      state.resetPasswordToken = null;
      state.signedOutRoute = 'SignIn';
      state.needsAvatarSetup = false;
    },
  },
});

export const {
  setCredentials,
  startEmailVerification,
  startPasswordReset,
  completeEmailVerification,
  setResetPasswordToken,
  finishAvatarSetup,
  logout,
  updateUser,
  setInitializing,
} = authSlice.actions;
export default authSlice.reducer;
