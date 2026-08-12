import { Platform } from 'react-native';

// Deployed backend API domain (Works on all devices and emulators)
export const LIVE_API_URL = 'https://iftek7500.ilmifygroup.com/api/v1';

// Local development URLs:
// - Use 'http://10.0.2.2:7500/api/v1' for Android Emulator
// - Use 'http://192.168.20.88:7500/api/v1' for physical Android device on same Wi-Fi
export const LOCAL_API_URL = 'https://iftek7500.ilmifygroup.com/api/v1';

export const API_URL_ANDROID = LIVE_API_URL;
export const API_URL_IOS = LIVE_API_URL;

export const API_URL = Platform.OS === 'android' ? API_URL_ANDROID : API_URL_IOS;

