/**
 * Open Discogs release URL – prefers native app on Android when installed.
 * Falls back to in-app browser (WebBrowser) when Discogs app is unavailable.
 */

import { Linking, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

const DISCOGS_APP_PACKAGE = 'com.discogs.app';

/** Extract release ID from Discogs URL (e.g. https://www.discogs.com/release/298 → 298) */
function getReleaseIdFromUrl(url: string): string | null {
  const match = url.match(/discogs\.com\/release\/(\d+)/i);
  return match ? match[1] : null;
}

/** Open URL in in-app browser (Chrome Custom Tabs / SFSafariViewController) */
async function openInAppBrowser(url: string): Promise<void> {
  await WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  });
}

/**
 * Opens a Discogs release (or other) URL. On Android, tries in order:
 * 1. discogs://release/ID (custom scheme – if Discogs app supports it)
 * 2. Intent VIEW with packageName (open in Discogs app if it handles https)
 * 3. Intent VIEW without packageName (may show app chooser)
 * 4. Fall back to in-app browser
 */
export async function openDiscogsUrl(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    await Linking.openURL(url);
    return;
  }

  if (Platform.OS === 'android') {
    const releaseId = getReleaseIdFromUrl(url);

    // 1. Try discogs://release/ID – many apps use this pattern
    if (releaseId) {
      const customUrl = `discogs://release/${releaseId}`;
      try {
        const supported = await Linking.canOpenURL(customUrl);
        if (supported) {
          await Linking.openURL(customUrl);
          return;
        }
      } catch {
        // canOpenURL may fail without queries; try openURL anyway
      }
      try {
        await Linking.openURL(customUrl);
        return;
      } catch {
        // Custom scheme not handled, continue
      }
    }

    // 2. Try IntentLauncher with packageName (Discogs app)
    try {
      const IntentLauncher = await import('expo-intent-launcher');
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: url,
        packageName: DISCOGS_APP_PACKAGE,
        category: 'android.intent.category.BROWSABLE',
      });
      return;
    } catch {
      // Continue to next strategy
    }

    // 3. Try intent without packageName – may show "Open with" chooser
    try {
      const IntentLauncher = await import('expo-intent-launcher');
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: url,
        category: 'android.intent.category.BROWSABLE',
      });
      return;
    } catch {
      // Continue to fallback
    }

    // 4. Fall back to in-app browser (keeps user in app)
    await openInAppBrowser(url);
    return;
  }

  // iOS: use the https URL – Universal Links may open in app if installed;
  // otherwise use in-app browser
  try {
    await Linking.openURL(url);
  } catch {
    await openInAppBrowser(url);
  }
}
