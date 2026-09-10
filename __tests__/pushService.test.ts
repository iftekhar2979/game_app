const mockState = { auth: { isAuthenticated: true, user: { id: 'user-1' } } };
const mockDispatch = jest.fn((_action: unknown) => ({
  unwrap: jest.fn().mockResolvedValue({}),
}));
const mockNavigate = jest.fn((_screen: string, _params?: unknown) => true);
const mockPermission = jest.fn();
const mockGetMessaging = jest.fn(() => ({}));
const mockToast = jest.fn();
let mockOpened: (message: any) => void;
let mockMessage: (message: any) => Promise<void>;
const mockStorage = new Map<string, string>();

jest.mock('../src/store', () => ({
  store: {
    getState: () => mockState,
    dispatch: (action: unknown) => mockDispatch(action),
  },
}));
jest.mock('../src/store/api/notificationApi', () => ({
  notificationApi: {
    endpoints: {
      registerDevice: { initiate: jest.fn(v => ({ register: v })) },
      unregisterDevice: { initiate: jest.fn(v => ({ unregister: v })) },
      markNotificationAsRead: { initiate: jest.fn(v => ({ read: v })) },
    },
    util: { invalidateTags: jest.fn(v => ({ tags: v })) },
  },
}));
jest.mock('../src/navigation/navigationRef', () => ({
  navigateFromOutside: (screen: string, params?: unknown) =>
    mockNavigate(screen, params),
}));
jest.mock('../src/utils/toast', () => ({
  toastEmitter: { show: (v: any) => mockToast(v) },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async key => mockStorage.get(key) ?? null),
  setItem: jest.fn(async (key, value) => {
    mockStorage.set(key, value);
  }),
  removeItem: jest.fn(async key => {
    mockStorage.delete(key);
  }),
}));
jest.mock('@react-native-firebase/messaging', () => ({
  AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2 },
  getMessaging: () => mockGetMessaging(),
  requestPermission: () => mockPermission(),
  getToken: jest.fn(async () => 'fcm-token'),
  deleteToken: jest.fn(async () => {}),
  getInitialNotification: jest.fn(async () => null),
  onNotificationOpenedApp: jest.fn((_app, callback) => {
    mockOpened = callback;
    return jest.fn();
  }),
  onMessage: jest.fn((_app, callback) => {
    mockMessage = callback;
    return jest.fn();
  }),
  onTokenRefresh: jest.fn(() => jest.fn()),
}));

import { PermissionsAndroid, Platform } from 'react-native';
import { notificationApi } from '../src/store/api/notificationApi';
import {
  flushPendingPushRoute,
  registerDeviceToken,
  requestPushPermission,
  startPushListeners,
  stopPushListeners,
  unregisterDeviceToken,
} from '../src/notifications/pushService';

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.clear();
  mockState.auth.isAuthenticated = true;
  mockState.auth.user.id = 'user-1';
  mockNavigate.mockReturnValue(true);
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: 'android',
  });
  Object.defineProperty(Platform, 'Version', { configurable: true, value: 33 });
  jest
    .spyOn(PermissionsAndroid, 'request')
    .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
});
afterEach(() => stopPushListeners());

it('requests Android 13 permission explicitly and respects denial', async () => {
  expect(await requestPushPermission()).toBe(true);
  expect(PermissionsAndroid.request).toHaveBeenCalledWith(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
  expect(mockPermission).not.toHaveBeenCalled();
  (PermissionsAndroid.request as jest.Mock).mockResolvedValue(
    PermissionsAndroid.RESULTS.DENIED,
  );
  expect(await requestPushPermission()).toBe(false);
});

it('waits for sign-in before replaying a notification tap', async () => {
  startPushListeners();
  mockState.auth.isAuthenticated = false;
  mockOpened({
    data: {
      screen: 'DraftRoom',
      relatedId: 'league-1',
      notificationId: 'pending-n1',
    },
  });
  flushPendingPushRoute();
  expect(mockNavigate).not.toHaveBeenCalled();
  mockState.auth.isAuthenticated = true;
  flushPendingPushRoute();
  expect(mockNavigate).toHaveBeenCalledWith('DraftRoom', {
    leagueId: 'league-1',
  });
  expect(
    notificationApi.endpoints.markNotificationAsRead.initiate,
  ).toHaveBeenCalledWith('pending-n1');
  mockNavigate.mockClear();
  flushPendingPushRoute();
  expect(mockNavigate).not.toHaveBeenCalled();
});

it('makes a foreground banner open its target and refreshes unread data', async () => {
  startPushListeners();
  await mockMessage({
    notification: { title: 'Your Turn to Pick!', body: 'On the clock' },
    data: { screen: 'DraftRoom', relatedId: 'league-1', notificationId: 'n-1' },
  });
  expect(mockNavigate).not.toHaveBeenCalled();
  mockToast.mock.calls[0][0].onPress();
  expect(mockNavigate).toHaveBeenCalledWith('DraftRoom', {
    leagueId: 'league-1',
  });
  expect(
    notificationApi.endpoints.markNotificationAsRead.initiate,
  ).toHaveBeenCalledWith('n-1');
  expect(notificationApi.util.invalidateTags).toHaveBeenCalled();
});

it('registers an unchanged token again after the account changes', async () => {
  await registerDeviceToken();
  await registerDeviceToken();
  expect(
    notificationApi.endpoints.registerDevice.initiate,
  ).toHaveBeenCalledTimes(1);
  mockState.auth.user.id = 'user-2';
  await registerDeviceToken();
  expect(
    notificationApi.endpoints.registerDevice.initiate,
  ).toHaveBeenCalledTimes(2);
});

it('unregisters the installation and clears queued routes on sign-out', async () => {
  startPushListeners();
  mockNavigate.mockReturnValue(false);
  mockOpened({ data: { screen: 'Wallet' } });
  await unregisterDeviceToken();
  expect(
    notificationApi.endpoints.unregisterDevice.initiate,
  ).toHaveBeenCalled();
  mockNavigate.mockClear();
  flushPendingPushRoute();
  expect(mockNavigate).not.toHaveBeenCalled();
});
