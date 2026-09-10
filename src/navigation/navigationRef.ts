import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';

/**
 * A handle on the navigator from outside React.
 *
 * A notification tap arrives from the Firebase SDK, not from a component, so
 * there is no `useNavigation` to reach for. This is the supported way to
 * navigate from that kind of callback.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navigate if the navigator is ready, and report whether it was.
 *
 * A push that opened the app from cold arrives before the tree has mounted, so
 * this genuinely fails sometimes - the caller holds the route and replays it
 * once the container is ready rather than dropping it.
 */
export function navigateFromOutside(
  screen: string,
  params?: Record<string, unknown>,
): boolean {
  if (!navigationRef.isReady()) return false;
  if (!navigationRef.getRootState()?.routeNames.includes(screen as keyof RootStackParamList)) return false;

  // The screen name here is data that arrived over the network, so it cannot
  // be checked against the param list at compile time. `targetForMessage` is
  // the gate that keeps it to routes this app actually has.
  (navigationRef.navigate as (name: string, params?: object) => void)(
    screen,
    params,
  );
  return true;
}
