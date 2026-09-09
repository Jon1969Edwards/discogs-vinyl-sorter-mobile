/**
 * Over-the-air JS updates via EAS Update (preview/production APKs).
 * Disabled in Metro/dev-client (__DEV__).
 */

import { Alert, AppState, type AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';

let dismissedThisSession = false;
let checkInFlight = false;

export function otaUpdatesAvailable(): boolean {
  return !__DEV__ && Updates.isEnabled;
}

export type OtaCheckResult = 'unavailable' | 'none' | 'later' | 'reloaded' | 'error';

export async function promptIfOtaUpdate(options?: {
  force?: boolean;
  silentIfNone?: boolean;
}): Promise<OtaCheckResult> {
  const force = options?.force === true;
  const silentIfNone = options?.silentIfNone !== false;

  if (!otaUpdatesAvailable()) {
    if (force && !silentIfNone) {
      Alert.alert(
        'Updates',
        'Over-the-air updates run in the installed preview/production APK, not in Metro.'
      );
    }
    return 'unavailable';
  }
  if (!force && dismissedThisSession) return 'later';
  if (checkInFlight) return 'none';
  checkInFlight = true;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) {
      if (force && !silentIfNone) {
        Alert.alert('Updates', 'You are on the latest version.');
      }
      return 'none';
    }
    await Updates.fetchUpdateAsync();
    return await new Promise<OtaCheckResult>((resolve) => {
      Alert.alert(
        'Update available',
        'A new version of Spindle is ready. Restart now to apply it?',
        [
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => {
              dismissedThisSession = true;
              resolve('later');
            },
          },
          {
            text: 'Restart',
            onPress: () => {
              void Updates.reloadAsync();
              resolve('reloaded');
            },
          },
        ]
      );
    });
  } catch (err) {
    if (force && !silentIfNone) {
      Alert.alert(
        'Updates',
        err instanceof Error ? err.message : 'Could not check for updates.'
      );
    }
    return 'error';
  } finally {
    checkInFlight = false;
  }
}

/** Check on launch and whenever the app returns to the foreground. */
export function subscribeOtaUpdateChecks(): () => void {
  if (!otaUpdatesAvailable()) return () => undefined;

  void promptIfOtaUpdate({ silentIfNone: true });

  const onChange = (state: AppStateStatus) => {
    if (state === 'active') {
      void promptIfOtaUpdate({ silentIfNone: true });
    }
  };
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}
