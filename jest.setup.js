/* eslint-env jest */

/**
 * Stubs for the social sign-in SDKs that have no usable jest mock of their own.
 * Importing either for real reaches for a native binary that does not exist
 * under jest, and every suite that renders an auth screen fails to load.
 *
 * (Google is covered by the mock its own package ships; see jest.config.js.)
 */
jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuth: {
    Operation: { LOGIN: 1, REFRESH: 2, LOGOUT: 3, IMPLICIT: 0 },
    Scope: { EMAIL: 0, FULL_NAME: 1 },
    isSupported: false,
    performRequest: jest.fn(async () => ({
      identityToken: null,
      email: null,
      fullName: null,
      nonce: null,
      user: 'mock-apple-user',
    })),
    getCredentialStateForUser: jest.fn(async () => 0),
  },
  appleAuthAndroid: { isSupported: false, signIn: jest.fn() },
}));

/**
 * `react-native-fbsdk-next` does ship a setup file, but it mocks the package by
 * a relative path that does not match how the app resolves it, so the real
 * module still loads. Mocking the package name directly is what actually works.
 */
jest.mock('react-native-fbsdk-next', () => ({
  Settings: {
    setAppID: jest.fn(),
    setClientToken: jest.fn(),
    initializeSDK: jest.fn(),
  },
  LoginManager: {
    logOut: jest.fn(),
    logInWithPermissions: jest.fn(async () => ({
      isCancelled: true,
      grantedPermissions: null,
      declinedPermissions: null,
    })),
  },
  AccessToken: {
    getCurrentAccessToken: jest.fn(async () => null),
  },
}));

/**
 * Stripe's SDK reaches straight for a TurboModule that only exists in a native
 * build, so importing it under jest throws before any test runs. The payment
 * flow's own logic lives in `src/wallet/creditPolling.ts` and is tested
 * directly; this stub only needs to let the screens that import the SDK load.
 */
jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(async () => ({})),
  StripeProvider: ({ children }) => children,
  useStripe: () => ({
    initPaymentSheet: jest.fn(async () => ({ error: undefined })),
    presentPaymentSheet: jest.fn(async () => ({ error: undefined })),
  }),
}));

/**
 * React Native Firebase reaches straight for a native module at import time, so
 * any suite that transitively imports the push service fails to load - which is
 * most of them, since `authService` clears the token on logout.
 *
 * The routing and registration decisions are pure and tested directly in
 * `__tests__/pushMessage.test.ts`; this stub only needs to let the modules that
 * import the SDK load, and to make every listener return a working teardown.
 */
jest.mock('@react-native-firebase/messaging', () => ({
  getMessaging: jest.fn(() => ({})),
  getToken: jest.fn(async () => 'test-fcm-token'),
  deleteToken: jest.fn(async () => undefined),
  requestPermission: jest.fn(async () => 1),
  onMessage: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn(async () => null),
  setBackgroundMessageHandler: jest.fn(),
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
}));

jest.mock('@react-native-firebase/app', () => ({
  getApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(),
}));

/**
 * VisionCamera is a native camera; under jest there is no camera to open. The
 * QR parsing it feeds is pure and tested in `__tests__/leagueCode.test.ts`.
 */
jest.mock('react-native-vision-camera', () => ({
  Camera: () => null,
  useCameraDevice: jest.fn(() => ({ id: 'back' })),
  useCameraPermission: jest.fn(() => ({
    hasPermission: true,
    requestPermission: jest.fn(async () => true),
  })),
  useCodeScanner: jest.fn((config) => config),
}));
