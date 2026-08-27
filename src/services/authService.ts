import { authStorage, UserProfileData } from './authStorage';
import {
  completeEmailVerification,
  logout,
  setCredentials,
  setInitializing,
  startEmailVerification,
} from '../store/slices/authSlice';
import { AppDispatch } from '../store';
import { API_URL } from '../config';

export class AuthService {
  /** Keeps the short-lived registration token available without opening the app. */
  async handleVerificationRequired(
    dispatch: AppDispatch,
    accessToken: string,
    user: UserProfileData
  ): Promise<void> {
    const pendingUser = { ...user, isEmailVerified: false, needsAvatarSetup: false };
    await authStorage.clearTokens();
    await authStorage.saveTokens(accessToken, '');
    await authStorage.saveUser(pendingUser);
    dispatch(startEmailVerification({ user: pendingUser, token: accessToken }));
  }

  /** Promotes a verified registration into the app and starts avatar setup. */
  async handleEmailVerified(dispatch: AppDispatch): Promise<void> {
    const storedUser = (await authStorage.getUser()) || {};
    await authStorage.saveUser({
      ...storedUser,
      isEmailVerified: true,
      needsAvatarSetup: true,
    });
    dispatch(completeEmailVerification());
  }

  /**
   * Called immediately after a successful login API response.
   * Saves access token + refresh token in Keychain, saves user profile in storage,
   * updates Redux state, and marks user as authenticated.
   */
  async handleLoginSuccess(
    dispatch: AppDispatch,
    accessToken: string,
    refreshToken: string,
    user: UserProfileData
  ): Promise<void> {
    // 1. Save tokens securely in Keychain
    await authStorage.saveTokens(accessToken, refreshToken);

    // 2. Save non-sensitive user info
    await authStorage.saveUser(user);

    // 3. Update Redux authentication state
    dispatch(
      setCredentials({
        user,
        token: accessToken,
      })
    );
  }

  /**
   * Called on logout.
   * Clears Keychain tokens and session state, then resets Redux state to navigate to Login.
   */
  async handleLogout(dispatch: AppDispatch): Promise<void> {
    try {
      const accessToken = await authStorage.getAccessToken();
      const refreshToken = await authStorage.getRefreshToken();
      if (accessToken) {
        // Optional backend logout call
        fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: refreshToken || '' }),
        }).catch(() => {});
      }
    } catch {
      // Ignore network failures on logout
    }

    // Clear Keychain + AsyncStorage session
    await authStorage.clearSession();

    // Reset Redux state
    dispatch(logout());
  }

  /**
   * Called on app startup to restore existing session from Keychain.
   */
  async restoreSession(dispatch: AppDispatch): Promise<boolean> {
    try {
      const accessToken = await authStorage.getAccessToken();
      const refreshToken = await authStorage.getRefreshToken();

      if (!accessToken && !refreshToken) {
        dispatch(setInitializing(false));
        return false;
      }

      const storedUser = await authStorage.getUser();

      // If access token exists, test/restore session
      if (accessToken) {
        if (storedUser?.isEmailVerified === false) {
          dispatch(
            startEmailVerification({
              user: storedUser,
              token: accessToken,
            })
          );
          return false;
        }

        dispatch(
          setCredentials({
            user: storedUser || {},
            token: accessToken,
          })
        );
        dispatch(setInitializing(false));
        return true;
      }

      // If access token expired but refresh token exists, attempt refresh
      if (refreshToken) {
        const response = await fetch(`${API_URL}/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (response.ok) {
          const resData = await response.json();
          const data = resData.data || resData;
          const newAccessToken = data.accessToken;
          const newRefreshToken = data.refreshToken || refreshToken;

          if (newAccessToken) {
            await authStorage.saveTokens(newAccessToken, newRefreshToken);
            dispatch(
              setCredentials({
                user: storedUser || {},
                token: newAccessToken,
              })
            );
            dispatch(setInitializing(false));
            return true;
          }
        }
      }

      // If refresh failed or invalid
      await authStorage.clearSession();
      dispatch(logout());
      return false;
    } catch {
      await authStorage.clearSession();
      dispatch(logout());
      return false;
    }
  }
}

export const authService = new AuthService();
