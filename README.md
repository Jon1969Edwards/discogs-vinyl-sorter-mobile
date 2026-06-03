# Discogs Vinyl Sorter – Mobile

React Native (Expo) app that replicates the Discogs Vinyl Sorter for Android and iOS. Connects to the Discogs API, fetches your collection, sorts LPs by artist/title/year, and lets you export TXT/CSV/JSON.

## Prerequisites

- **Node.js 18+** – [nodejs.org](https://nodejs.org)
- **npm** or **yarn**
- **Expo Go** app on your phone (for development)
- **Discogs account** – use OAuth "Sign in with Discogs" or a Personal Access Token

## Setup

1. Install dependencies:

```bash
npm install
```

2. (Recommended) For OAuth "Sign in with Discogs", copy `.env.example` to `.env`:

   - Create an app at [Discogs → Settings → Developers](https://www.discogs.com/settings/developers)
   - Add callback URL: `discogvinylsorter://callback` (see `docs/OAUTH_SETUP.md`)
   - Add your consumer key and secret to `.env`

3. Start the development server:

```bash
npm start
```

4. **Run on device/emulator** (this project uses a **development build**, not Expo Go):
   - **SDK path:** copy `android/local.properties.example` → `android/local.properties` (or rely on default `%LOCALAPPDATA%\Android\Sdk`)
   - **Emulator:** `npm run android:emulator` → wait for the home screen → `npm run android`
   - **USB phone:** enable USB debugging, connect, then `npm run android` (skips emulator)
   - First build: `npm run android` (may auto-start an AVD; cold boot can take 5+ minutes on Windows)
   - Day-to-day JS: `npm start`, then open the **Discogs Vinyl Sorter** dev app (not Expo Go)

If you see `RNGestureHandlerModule could not be found`, you opened the bundle in **Expo Go** or an outdated APK — run `npm run android` once, then use `npm start` and the dev client app.

**Emulator / AEHD hypervisor failed on Windows?** See [docs/ANDROID_EMULATOR_WINDOWS.md](docs/ANDROID_EMULATOR_WINDOWS.md). Quick workaround: `$env:ACCEL_OFF="1"; npm run android:emulator` (slower), or use a USB phone with USB debugging.

## Project Structure

```
src/
├── components/   # Reusable UI components
├── screens/      # App screens (Auth, Collection, Settings)
├── services/     # Discogs API client
├── utils/        # Sorting, filtering logic
├── hooks/        # Custom React hooks
└── types/        # TypeScript interfaces
```

## Scripts

| Command   | Description              |
| --------- | ------------------------ |
| `npm start`   | Start Expo dev server    |
| `npm run android` | Open in Android emulator |
| `npm run ios`     | Open in iOS simulator   |

## Related

- **Windows/Desktop app**: See sibling folder `discogs-vinyl-sorter-windows`
- **Implementation plan**: [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
