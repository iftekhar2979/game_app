/**
 * Reading a push payload.
 *
 * Firebase data payloads are strings and only strings - the server stringifies
 * every metadata field on the way out - so everything here takes
 * `Record<string, string>` and is defensive about what is missing. A push that
 * arrives malformed must open the app somewhere sensible, never crash it: the
 * user tapped a notification, and a crash is the one response worse than
 * landing on the wrong screen.
 *
 * Kept pure so the routing can be tested without a navigator, a device, or
 * Firebase.
 */

export interface PushTarget {
  screen: string;
  params?: Record<string, unknown>;
}

/** Where a tap should land. `null` means "just open the app". */
export type PushRoute = PushTarget | null;

/**
 * The screen the notification list lives on.
 *
 * The fallback for anything unrecognised: it holds every notification, so the
 * user always finds the thing they tapped even when the payload did not say
 * where it was. Guessing a specific screen and getting it wrong is worse - it
 * looks like the app lost their notification.
 */
export const NOTIFICATION_LIST_SCREEN = 'Notification';

/** Routes a push is allowed to open, and how to build their params. */
const ROUTES: Record<string, (data: Record<string, string>) => PushRoute> = {
  DraftRoom: data =>
    data.relatedId
      ? { screen: 'DraftRoom', params: { leagueId: data.relatedId } }
      : null,
  DfsContestDetail: data =>
    data.relatedId
      ? { screen: 'DfsContestDetail', params: { contestId: data.relatedId } }
      : null,
  PostDetails: data => {
    const postId = postIdFrom(data);
    // Without an id there is no post to open, so the list is the honest
    // destination rather than a details screen that renders an error.
    return postId ? { screen: 'PostDetails', params: { postId } } : null;
  },
  LeagueDetail: data =>
    data.relatedId
      ? {
          screen: 'LeagueDetail',
          params: {
            leagueId: data.relatedId,
            ...(data.reason?.startsWith('lineup_reminder:')
              ? { initialTab: 'Team' }
              : {}),
          },
        }
      : null,
  LeagueChat: data =>
    data.relatedId
      ? { screen: 'LeagueChat', params: { leagueId: data.relatedId } }
      : null,
  Wallet: () => ({ screen: 'Wallet' }),
  Notification: () => ({ screen: NOTIFICATION_LIST_SCREEN }),
};

export function targetForMessage(
  data?: Record<string, unknown> | null,
): PushTarget {
  const payload = Object.fromEntries(
    Object.entries(data ?? {}).filter(([, value]) => typeof value === 'string'),
  ) as Record<string, string>;
  const screen =
    payload.screen ||
    (['post', 'comment'].includes(payload.relatedType) ? 'PostDetails' : '');
  const build = Object.prototype.hasOwnProperty.call(ROUTES, screen)
    ? ROUTES[screen]
    : undefined;
  const target = build?.(payload) ?? null;

  // Everything ends somewhere: an unmapped screen, a missing id, a payload with
  // no routing at all. The list is where the notification itself is.
  return target ?? { screen: NOTIFICATION_LIST_SCREEN };
}

/**
 * The post a social notification is about.
 *
 * `relatedId` is the entity that was reacted to, which for a comment is the
 * comment - not the post the screen needs. The deep link is the only field
 * that always carries the post id, so it is read first.
 */
export function postIdFrom(data: Record<string, string>): string | null {
  const fromLink = /\/community\/posts\/([^/?#]+)/.exec(data.deepLink ?? '');
  if (fromLink) return fromLink[1];

  // A reaction on a post: there the entity and the post are the same thing.
  if ((!data.relatedType || data.relatedType === 'post') && data.relatedId)
    return data.relatedId;

  return null;
}

/**
 * A stable id for this install.
 *
 * The server keys a device row on it, so it has to survive app restarts but
 * must NOT survive an uninstall - a reinstall gets a new FCM token, and reusing
 * the id would overwrite a row that may still belong to a different account on
 * a shared device. Storage that is cleared with the app is exactly right.
 *
 * Not a hardware identifier on purpose: those are restricted, need extra
 * permissions, and identify the person rather than the install.
 */
export function newDeviceId(random: () => number = Math.random): string {
  let id = '';
  while (id.length < 32) {
    id += Math.floor(random() * 0xffffffff)
      .toString(16)
      .padStart(8, '0');
  }
  return id.slice(0, 32);
}

/**
 * Whether a freshly read token needs sending to the server.
 *
 * Registering on every launch would be a wasted request per cold start, and
 * the token only changes when Firebase rotates it or the app is reinstalled.
 */
export function shouldRegister(params: {
  token: string | null | undefined;
  lastRegisteredToken: string | null | undefined;
  isAuthenticated: boolean;
}): boolean {
  if (!params.isAuthenticated) return false;
  if (!params.token?.trim()) return false;
  return params.token !== params.lastRegisteredToken;
}
