import { Platform } from 'react-native';
import {
  FACEBOOK_APP_ID as ENV_FACEBOOK_APP_ID,
  FACEBOOK_CLIENT_TOKEN as ENV_FACEBOOK_CLIENT_TOKEN,
  GOOGLE_IOS_CLIENT_ID as ENV_GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID as ENV_GOOGLE_WEB_CLIENT_ID,
} from '@env';

// Deployed backend API domain (Works on all devices and emulators)
export const LIVE_API_URL = 'https://iftek7500.ilmifygroup.com/api/v1';

// Local development URLs:
// - Use 'http://10.0.2.2:7500/api/v1' for Android Emulator
// - Use 'http://192.168.20.88:7500/api/v1' for physical Android device on same Wi-Fi
export const LOCAL_API_URL = 'https://iftek7500.ilmifygroup.com/api/v1';

export const API_URL_ANDROID = LIVE_API_URL;
export const API_URL_IOS = LIVE_API_URL;

export const API_URL = Platform.OS === 'android' ? API_URL_ANDROID : API_URL_IOS;


// --- Social sign-in ---------------------------------------------------------
// Read from .env via react-native-dotenv. The backend verifies every provider
// token against its own copy of these client ids, so the two must be kept in
// sync - a mismatch shows up as a 401 "issued for another app", not as a
// client-side error.
export const GOOGLE_WEB_CLIENT_ID = ENV_GOOGLE_WEB_CLIENT_ID || '';
export const GOOGLE_IOS_CLIENT_ID = ENV_GOOGLE_IOS_CLIENT_ID || '';
export const FACEBOOK_APP_ID = ENV_FACEBOOK_APP_ID || '';
export const FACEBOOK_CLIENT_TOKEN = ENV_FACEBOOK_CLIENT_TOKEN || '';

/**
 * Sign in with Apple is iOS-only. Android has no equivalent native flow, so the
 * button is hidden there rather than shown and failing on tap.
 */
export const IS_APPLE_SIGN_IN_SUPPORTED = Platform.OS === 'ios';
