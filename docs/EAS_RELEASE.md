# EAS release builds (Android)

Standalone installs that **do not** need Metro. Distinct from the **development** dev-client build.

## Prerequisites

1. Complete [SMOKE_TEST_CHECKLIST.md](./SMOKE_TEST_CHECKLIST.md) on a dev-client build.
2. [Expo EAS CLI](https://docs.expo.dev/build/setup/): `npm install -g eas-cli` and `eas login`.
3. OAuth / license secrets on EAS (Project → Secrets), **not** committed to git:
   - `DISCOGS_CONSUMER_KEY`
   - `DISCOGS_CONSUMER_SECRET`
   - `VSS_LICENSE_SECRET` (same HMAC secret as Windows Pro keys; required for Pro activation in release builds)
4. Discogs app callback URL: `discogvinylsorter://callback` (see [OAUTH_SETUP.md](./OAUTH_SETUP.md)).

## Profiles ([eas.json](../eas.json))

| Profile | Use |
|---------|-----|
| `development` | Dev client + Metro (already used for day-to-day) |
| `preview` | Internal APK for testing without Metro |
| `production` | Play Store–style build (`autoIncrement` version) |

## OAuth environment variables

Add `DISCOGS_CONSUMER_KEY`, `DISCOGS_CONSUMER_SECRET`, and optionally `VSS_LICENSE_SECRET` in the Expo dashboard for **preview** and **production** (Sensitive / Secret visibility). The `eas-build-pre-install` script writes them to `.env` on the build server so OAuth (and Pro keys) compile into the APK. Without `VSS_LICENSE_SECRET`, Pro activation fails closed in release.

After adding or changing variables, you must run a **new** build (reinstall the new APK).

## Over-the-air updates (JS / UI)

Day-to-day TypeScript changes do **not** need a new APK. After this `preview` APK is installed:

1. Push to `develop` (or `main`) — GitHub Action publishes an [EAS Update](https://docs.expo.dev/eas-update/introduction/).
2. Open Spindle (or return it to the foreground). It asks **Restart now** if a bundle is waiting.
3. Settings → About → **Check for updates** does the same check on demand.

Native changes (new Expo modules, `app.json` plugins, icons, OAuth secrets baked into the binary) still need `npm run build:preview` and a reinstall.

This repo has a native `android/` folder (bare workflow). `runtimeVersion` in `app.json` must be a string such as `"1.0.0"`, not `{ "policy": "appVersion" }`. Keep that string in sync with `version` when you ship a new native APK.

**One-time setup**

1. Create an Expo access token: [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens).
2. Add repo secret `EXPO_TOKEN` on [discogs-vinyl-sorter-mobile](https://github.com/Jon1969Edwards/discogs-vinyl-sorter-mobile) → Settings → Secrets.
3. Build and install a **new** preview APK (this one includes `expo-updates`):

```bash
npm run build:preview
```

Manual publish (without waiting for CI):

```bash
npm run update:preview -- --message "genre sync"
```

The old preview APK (build `262046a3-…`) cannot receive OTA updates. Replace it with the new one.

## Launcher icon and splash

Icon paths are in [app.json](../app.json) (`assets/icon.png`, `adaptive-icon.png`, `splash-icon.png`). Metro/dev client may not update the home-screen icon. To see new artwork on a installed APK, run a **new** `preview` or `production` build and reinstall.

## Commands

**Internal test APK (recommended first):**

```bash
eas build --platform android --profile preview
```

**Production (AAB/APK per eas.json):**

```bash
eas build --platform android --profile production
```

Download the artifact from the EAS dashboard or CLI link when the build finishes.

## After install

1. Open the app (not Expo Go).
2. Sign in with OAuth or PAT.
3. Confirm deep link OAuth completes (`discogvinylsorter://callback`).
4. Collection fetch and export work **without** `npm start`.

## Version bumps

Increment `version` in [app.json](../app.json) before each store submission. Production profile uses `autoIncrement` for Android `versionCode`.

## Latest preview build (submitted during plan implementation)

| Field | Value |
|-------|--------|
| Profile | `preview` (APK) |
| Build ID | `262046a3-5131-46b1-94f2-04b7e86ae9a4` |
| Dashboard | https://expo.dev/accounts/bovverskin1969/projects/discogs-vinyl-sorter |

After the build finishes, download the APK from the dashboard and run [SMOKE_TEST_CHECKLIST.md](./SMOKE_TEST_CHECKLIST.md) **without Metro**.

**OAuth on EAS:** add `DISCOGS_CONSUMER_KEY` and `DISCOGS_CONSUMER_SECRET` as EAS secrets for the `preview` environment if OAuth fails on the standalone APK (local `.env` is not uploaded).

**Note:** After the first OTA-capable preview APK is installed, JS changes go out with `eas update` (or the GitHub Action). Rebuild the APK only for native/config changes.

## Troubleshooting

- **OAuth fails on release build:** verify EAS secrets and Discogs callback URL match `app.json` `scheme`.
- **Gradle/Java errors on EAS:** ensure `android/gradle.properties` has no Windows-only `org.gradle.java.home` path (Linux EAS builders).
