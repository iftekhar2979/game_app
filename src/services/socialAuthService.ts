import { Platform } from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { AccessToken, LoginManager, Settings } from 'react-native-fbsdk-next';
import {
  FACEBOOK_APP_ID,
  FACEBOOK_CLIENT_TOKEN,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
} from '../config';

export type SocialProvider = 'google' | 'apple' | 'facebook';

/**
 * What the native flow produced, in the shape POST /auth/social/:provider
 * expects. Google and Apple return an OIDC `idToken`; Facebook has no ID token
 * and returns an `accessToken` the backend validates against the Graph API.
 */
export interface SocialCredential {
  idToken?: string;
  accessToken?: string;
  /** Apple hands over the display name once, on the first authorization only. */
  fullName?: string;
  /** Present only when the provider actually shares it (Apple may not). */
  email?: string;
}

/** Thrown when the user backed out of the provider sheet - never an error to show. */
export class SocialSignInCancelled extends Error {
  constructor() {
    super('Sign-in cancelled');
    this.name = 'SocialSignInCancelled';
  }
}

let googleConfigured = false;

/**
 * Configures the Google SDK once per app run.
 *
 * `webClientId` is what decides the audience of the ID token, on Android as
 * well as iOS - that is the id the backend checks, so it is required on both
 * platforms even though it reads like a web-only setting.
 */
function configureGoogle() {
  if (googleConfigured) {
    return;
  }

  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    scopes: ['profile', 'email'],
    offlineAccess: false,
  });
  googleConfigured = true;
}

let facebookInitialized = false;

function configureFacebook() {
  if (facebookInitialized) {
    return;
  }

  // The native SDKs also read these from AndroidManifest / Info.plist; setting
  // them here keeps a single .env-driven source of truth for the JS side and
  // makes a missing configuration fail loudly instead of silently.
  if (FACEBOOK_APP_ID) {
    Settings.setAppID(FACEBOOK_APP_ID);
  }
  if (FACEBOOK_CLIENT_TOKEN) {
    Settings.setClientToken(FACEBOOK_CLIENT_TOKEN);
  }
  Settings.initializeSDK();
  facebookInitialized = true;
}

async function signInWithGoogle(): Promise<SocialCredential> {
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error('Google sign-in is not configured. Set GOOGLE_WEB_CLIENT_ID in .env.');
  }

  configureGoogle();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Sign the previous account out first: without it the SDK silently reuses
    // the cached account, so a user who picked the wrong one can never switch.
    await GoogleSignin.signOut().catch(() => {});

    const response = await GoogleSignin.signIn();

    if (response.type === 'cancelled') {
      throw new SocialSignInCancelled();
    }

    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new Error('Google did not return an identity token. Please try again.');
    }

    return {
      idToken,
      fullName: response.data?.user?.name ?? undefined,
      email: response.data?.user?.email ?? undefined,
    };
  } catch (error: any) {
    if (error instanceof SocialSignInCancelled) {
      throw error;
    }
    if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new SocialSignInCancelled();
    }
    if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play services are not available on this device.');
    }
    throw error;
  }
}

async function signInWithApple(): Promise<SocialCredential> {
  if (Platform.OS !== 'ios') {
    throw new Error('Sign in with Apple is only available on iOS.');
  }

  const response = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
  });

  if (!response.identityToken) {
    // The user dismissed the sheet, or Apple refused to issue a token.
    throw new SocialSignInCancelled();
  }

  // Apple releases the name exactly once, on the first authorization for this
  // app. Every later sign-in returns null here, which is why the backend only
  // uses it when creating the account.
  const { givenName, familyName } = response.fullName ?? {};
  const fullName = [givenName, familyName].filter(Boolean).join(' ');

  return {
    idToken: response.identityToken,
    fullName: fullName || undefined,
    email: response.email ?? undefined,
  };
}

async function signInWithFacebook(): Promise<SocialCredential> {
  if (!FACEBOOK_APP_ID) {
    throw new Error('Facebook sign-in is not configured. Set FACEBOOK_APP_ID in .env.');
  }

  configureFacebook();

  // Clear any stale session so the permission dialog reflects the current user.
  LoginManager.logOut();

  const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

  if (result.isCancelled) {
    throw new SocialSignInCancelled();
  }

  const token = await AccessToken.getCurrentAccessToken();
  if (!token?.accessToken) {
    throw new Error('Facebook did not return an access token. Please try again.');
  }

  return { accessToken: token.accessToken.toString() };
}

/**
 * Runs the native flow for one provider and returns the credential to post to
 * the backend. Callers must treat `SocialSignInCancelled` as a no-op.
 */
export async function getSocialCredential(provider: SocialProvider): Promise<SocialCredential> {
  switch (provider) {
    case 'google':
      return signInWithGoogle();
    case 'apple':
      return signInWithApple();
    case 'facebook':
      return signInWithFacebook();
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

/**
 * Drops the provider-side session on logout, so the next sign-in shows the
 * account picker instead of silently reusing the last account.
 */
export async function clearSocialSessions(): Promise<void> {
  await Promise.all([
    GoogleSignin.signOut().catch(() => {}),
    Promise.resolve().then(() => LoginManager.logOut()).catch(() => {}),
  ]);
}
