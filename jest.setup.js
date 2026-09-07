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
