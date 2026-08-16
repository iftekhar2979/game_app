import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_SERVICE = 'com.gameapp.accesstoken';
const REFRESH_TOKEN_SERVICE = 'com.gameapp.refreshtoken';
const USER_KEY = '@gameapp_user_profile';

export interface UserProfileData {
  id?: string;
  email?: string;
  name?: string;
  fullName?: string;
  username?: string;
  avatarUrl?: string;
  [key: string]: any;
}

class AuthStorageService {
  private inMemoryAccessToken: string | null = null;
  private inMemoryRefreshToken: string | null = null;

  /**
   * Securely saves access token and refresh token in Keychain and memory cache.
   */
  async saveTokens(accessToken: string, refreshToken: string): Promise<boolean> {
    this.inMemoryAccessToken = accessToken || null;
    this.inMemoryRefreshToken = refreshToken || null;
    try {
      if (accessToken) {
        await Keychain.setGenericPassword('accessToken', accessToken, {
          service: ACCESS_TOKEN_SERVICE,
        });
      }
      if (refreshToken) {
        await Keychain.setGenericPassword('refreshToken', refreshToken, {
          service: REFRESH_TOKEN_SERVICE,
        });
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Retrieves secure Access Token from memory cache or Keychain.
   */
  async getAccessToken(): Promise<string | null> {
    if (this.inMemoryAccessToken) return this.inMemoryAccessToken;
    try {
      const credentials = await Keychain.getGenericPassword({
        service: ACCESS_TOKEN_SERVICE,
      });
      if (credentials && credentials.password) {
        this.inMemoryAccessToken = credentials.password;
        return credentials.password;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Retrieves secure Refresh Token from memory cache or Keychain.
   */
  async getRefreshToken(): Promise<string | null> {
    if (this.inMemoryRefreshToken) return this.inMemoryRefreshToken;
    try {
      const credentials = await Keychain.getGenericPassword({
        service: REFRESH_TOKEN_SERVICE,
      });
      if (credentials && credentials.password) {
        this.inMemoryRefreshToken = credentials.password;
        return credentials.password;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clears access token and refresh token from memory cache and Keychain.
   */
  async clearTokens(): Promise<boolean> {
    this.inMemoryAccessToken = null;
    this.inMemoryRefreshToken = null;
    try {
      await Keychain.resetGenericPassword({ service: ACCESS_TOKEN_SERVICE });
      await Keychain.resetGenericPassword({ service: REFRESH_TOKEN_SERVICE });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Stores non-sensitive user profile information in AsyncStorage.
   */
  async saveUser(user: UserProfileData): Promise<boolean> {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Retrieves non-sensitive user profile information.
   */
  async getUser(): Promise<UserProfileData | null> {
    try {
      const json = await AsyncStorage.getItem(USER_KEY);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Completely clears tokens and user session.
   */
  async clearSession(): Promise<void> {
    await this.clearTokens();
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      // Ignore
    }
  }
}

export const authStorage = new AuthStorageService();
