/**
 * Open Discogs release URL – prefers native app on Android/iOS when installed.
 */

import { Linking, Platform } from 'react-native';

const DISCOGS_APP_PACKAGE = 'com.discogs.app';

/**
 * Opens a Discogs release (or other) URL. On Android, uses an intent URL to prefer
 * opening in the Discogs app when installed; falls back to browser otherwise.
 */
export async function openDiscogsUrl(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    await Linking.openURL(url);
    return;
  }

  if (Platform.OS === 'android') {
    // Intent URL: ask Android to open this URL in the Discogs app.
    // If the app is installed and handles discogs.com links, it opens there.
    // Otherwise browser_fallback_url opens the web page.
    const encodedFallback = encodeURIComponent(url);
    const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=${DISCOGS_APP_PACKAGE};S.browser_fallback_url=${encodedFallback};end`;

    try {
      await Linking.openURL(intentUrl);
    } catch {
      // If intent fails (e.g. app not installed), fall back to web URL
      await Linking.openURL(url);
    }
    return;
  }

  // iOS: use the https URL – Universal Links may open in the app if installed
  await Linking.openURL(url);
}
