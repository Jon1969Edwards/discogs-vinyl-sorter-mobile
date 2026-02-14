/**
 * Open Discogs release URL – prefers native app on Android when installed.
 */

import { Linking, Platform } from 'react-native';

const DISCOGS_APP_PACKAGE = 'com.discogs.app';

/**
 * Opens a Discogs release (or other) URL. On Android, uses IntentLauncher to
 * explicitly open the URL in the Discogs app when installed; falls back to
 * browser otherwise.
 */
export async function openDiscogsUrl(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    await Linking.openURL(url);
    return;
  }

  if (Platform.OS === 'android') {
    try {
      const IntentLauncher = await import('expo-intent-launcher');
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: url,
        packageName: DISCOGS_APP_PACKAGE,
        category: 'android.intent.category.BROWSABLE',
      });
    } catch {
      // Discogs app may not handle the intent (not installed or no handler).
      // Fall back to opening in default browser.
      await Linking.openURL(url);
    }
    return;
  }

  // iOS: use the https URL – Universal Links may open in the app if installed
  await Linking.openURL(url);
}
