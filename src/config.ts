import { Platform } from 'react-native';

// Use the local IP address since the app is running on a physical Android device
export const API_URL_ANDROID = 'http://192.168.20.88:7500/api/v1';
export const API_URL_IOS = 'http://192.168.20.88:7500/api/v1';

export const API_URL = Platform.OS === 'android' ? API_URL_ANDROID : API_URL_IOS;
