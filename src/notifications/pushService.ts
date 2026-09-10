import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthorizationStatus,
  deleteToken,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
} from '@react-native-firebase/messaging';
import { store } from '../store';
import { notificationApi } from '../store/api/notificationApi';
import { navigateFromOutside } from '../navigation/navigationRef';
import { showToast } from '../utils/toast';
import { newDeviceId, shouldRegister, targetForMessage } from './pushMessage';

/**
 * The part of a Firebase message this app reads.
 *
 * Declared here rather than imported: v26 does not re-export `RemoteMessage`
 * from the package root, and reaching into its `lib/types` path couples this
 * file to the library's internal layout. These two fields are the whole
 * contract we depend on.
 */
interface PushMessage {
  notification?: { title?: string; body?: string };
  data?: Record<string, unknown>;
}

/**
 * Push notifications, from permission to tap.
 *
 * Everything here touches the device or the network. The decisions - where a
 * tap should land, whether a token is worth sending - live in `pushMessage.ts`
 * so they can be tested; this file is the wiring.
 *
 * Deliberately fail-soft throughout. Push is an enhancement: a user who denies
 * permission, or a build whose Firebase config is missing, must still get a
 * working app. Every entry point catches, and none of them rethrow.
 */

const DEVICE_ID_KEY = '@push/deviceId';
const LAST_TOKEN_KEY = '@push/lastRegisteredToken';

/** A route from a tap that arrived before the navigator existed. */
let pendingRoute: { screen: string; params?: Record<string, unknown> } | null =
  null;

let unsubscribers: Array<() => void> = [];

/**
 * The id this install is known by, created once and kept.
 *
 * Stored rather than derived: the server upserts a device row on
 * (userId, deviceId), so an id that changed per launch would leave a trail of
 * rows each holding a token that is no longer current.
 */
export async function getDeviceId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;

    const created = newDeviceId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    // Storage failed. A per-session id still lets this launch receive pushes,
    // which beats refusing to register at all.
    return newDeviceId();
  }
}

/**
 * Ask for permission, if it has not been answered already.
 *
 * iOS shows the system prompt here. Android below 13 grants it implicitly;
 * from 13 the same call maps onto the POST_NOTIFICATIONS runtime permission.
 */
export async function requestPushPermission(): Promise<boolean> {
  try {
    const status = await requestPermission(getMessaging());

    return (
      status === AuthorizationStatus.AUTHORIZED ||
      status === AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.warn('[push] permission request failed', error);
    return false;
  }
}

/**
 * Hand the current token to the server.
 *
 * Called after sign-in and whenever Firebase rotates the token. Skipped when
 * the token has not changed, so a cold start does not spend a request saying
 * what the server already knows.
 */
export async function registerDeviceToken(options: { force?: boolean } = {}) {
  try {
    const isAuthenticated = store.getState().auth.isAuthenticated;
    if (!isAuthenticated) return;

    const granted = await requestPushPermission();
    if (!granted) return;

    const token = await getToken(getMessaging());
    const lastRegistered = options.force
      ? null
      : await AsyncStorage.getItem(LAST_TOKEN_KEY);

    if (!shouldRegister({ token, lastRegisteredToken: lastRegistered, isAuthenticated })) {
      return;
    }

    const deviceId = await getDeviceId();

    await store
      .dispatch(
        notificationApi.endpoints.registerDevice.initiate({
          fcmToken: token,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          deviceId,
          userAgent: `${Platform.OS} ${Platform.Version}`,
        }),
      )
      .unwrap();

    await AsyncStorage.setItem(LAST_TOKEN_KEY, token);
  } catch (error) {
    // Never blocks sign-in. The next launch, or the next token refresh, tries
    // again - and until then the user simply has no push, not a broken app.
    console.warn('[push] could not register this device', error);
  }
}

/**
 * Forget the token on sign-out.
 *
 * Deleting it at the Firebase end stops this device receiving anything meant
 * for the account that just left - which matters on a shared phone, where the
 * next person would otherwise see the previous user's notifications.
 */
export async function unregisterDeviceToken() {
  try {
    await deleteToken(getMessaging());
    await AsyncStorage.removeItem(LAST_TOKEN_KEY);
  } catch (error) {
    console.warn('[push] could not clear the push token', error);
  }
}

/**
 * Start listening. Returns the teardown.
 *
 * Three arrivals, three behaviours:
 *
 *   foreground   the OS shows nothing, so the app has to. A toast rather than a
 *                system notification: the user is already looking at the app,
 *                and a banner over the screen they are using is an interruption
 *                they did not need.
 *   background   the OS drew the notification; this fires when it is tapped.
 *   cold start   the app was not running; the tap is read once at launch.
 */
export function startPushListeners(): () => void {
  stopPushListeners();

  const app = getMessaging();

  unsubscribers = [
    onMessage(app, async (message: PushMessage) => {
      const { title, body } = message.notification ?? {};
      if (title || body) {
        showToast.info(title ?? 'New notification', body);
      }
    }),

    onNotificationOpenedApp(app, (message: PushMessage) => {
      routeTo(message);
    }),

    onTokenRefresh(app, () => {
      // A rotated token makes the stored one dead. `force` because the compare
      // against the last registered value is exactly what changed.
      void registerDeviceToken({ force: true });
    }),
  ];

  // A tap that launched the app from cold. Read once - it stays available for
  // the life of the process, so re-reading it would navigate again on every
  // resume.
  void getInitialNotification(app)
    .then((message: PushMessage | null) => {
      if (message) routeTo(message);
    })
    .catch(() => {});

  return stopPushListeners;
}

export function stopPushListeners() {
  unsubscribers.forEach((off) => {
    try {
      off();
    } catch {
      // Already torn down.
    }
  });
  unsubscribers = [];
}

/**
 * Replay a tap that arrived before the navigator was ready.
 *
 * Called from `NavigationContainer`'s onReady. Without it, a push that opens
 * the app from cold lands on the home screen: the route was computed correctly
 * and then thrown away because there was nothing to navigate yet.
 */
export function flushPendingPushRoute() {
  if (!pendingRoute) return;

  const route = pendingRoute;
  pendingRoute = null;

  if (!navigateFromOutside(route.screen, route.params)) {
    pendingRoute = route;
  }
}

function routeTo(message: PushMessage) {
  const target = targetForMessage(message.data as Record<string, string>);

  if (!navigateFromOutside(target.screen, target.params)) {
    pendingRoute = target;
  }
}
