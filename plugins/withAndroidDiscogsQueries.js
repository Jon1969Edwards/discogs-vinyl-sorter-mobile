const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Adds Android queries so we can open the Discogs app via custom scheme or package.
 * Required for Android 11+ package visibility.
 */
function withAndroidDiscogsQueries(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    if (!manifest) return config;

    manifest.queries = {
      package: [{ $: { 'android:name': 'com.discogs.app' } }],
      intent: [
        {
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          category: [
            { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
            { $: { 'android:name': 'android.intent.category.DEFAULT' } },
          ],
          data: [{ $: { 'android:scheme': 'discogs' } }],
        },
      ],
    };

    return config;
  });
}

module.exports = withAndroidDiscogsQueries;
