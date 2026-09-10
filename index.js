/**
 * @format
 */

import { AppRegistry } from 'react-native';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

/**
 * Push received while the app is backgrounded or killed.
 *
 * Registered here, outside the component tree, because Firebase runs this in a
 * headless JS context where App has not mounted. The OS has already drawn the
 * notification for us - the handler exists so a data-only message is not
 * dropped, and so the SDK stops warning that none is set.
 */
setBackgroundMessageHandler(getMessaging(), async () => {
  // Nothing to do yet: the tap is handled by `onNotificationOpenedApp` and
  // `getInitialNotification` once the app is running. Kept as the seam for
  // work that must happen without the UI, such as a badge count.
});

AppRegistry.registerComponent(appName, () => App);
