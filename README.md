# Spindle – Mobile

React Native (Expo) companion to the Windows **Spindle** app. Connects to the Discogs API, fetches your collection, sorts LPs by artist/title/year, and lets you export TXT/CSV/JSON.

Not affiliated with Discogs.

## Prerequisites

- **Node.js 18+** – [nodejs.org](https://nodejs.org)
- **npm** or **yarn**
- **Physical Android phone** *or* working emulator (emulator needs VT-x in BIOS — see below)
- **Discogs account** – use OAuth "Sign in with Discogs" or a Personal Access Token

## Setup

1. Install dependencies:

```bash
npm install
```

2. (Recommended) For OAuth "Sign in with Discogs", copy `.env.example` to `.env`:

   - Create an app at [Discogs → Settings → Developers](https://www.discogs.com/settings/developers)
   - Application name: **Spindle** (or Spindle Mobile)
   - Add callback URL: `discogvinylsorter://callback` (see `docs/OAUTH_SETUP.md`)
   - Add your consumer key and secret to `.env`

3. Start the development server:

```bash
npm start
```

4. **Run on device** (development build — **not Expo Go**):
   - **No emulator / emulator broken?** → [docs/DEVELOP_WITHOUT_EMULATOR.md](./docs/DEVELOP_WITHOUT_EMULATOR.md) (USB phone or EAS cloud APK)
   - **Phone (recommended):** USB debugging on → `adb devices` shows `device` → `npm run android:device`
   - **Emulator (optional):** VT-x enabled in BIOS → `npm run android:emulator` → home screen → `npm run android`
   - Day-to-day JS: `npm run start:lan`, then open **Spindle** on the phone with `http://YOUR_PC_IP:8081` (not Expo Go; not `localhost`)
   - Tunnel (`npm run start:tunnel`) only if LAN fails—see [docs/DEVELOP_WITHOUT_EMULATOR.md](./docs/DEVELOP_WITHOUT_EMULATOR.md) if ngrok errors

If you see `RNGestureHandlerModule could not be found`, you opened the bundle in **Expo Go** or an outdated APK — run `npm run android` once, then use `npm start` and the dev client app.

**Emulator / AEHD hypervisor failed on Windows?** See [docs/ANDROID_EMULATOR_WINDOWS.md](docs/ANDROID_EMULATOR_WINDOWS.md). Quick workaround: `$env:ACCEL_OFF="1"; npm run android:emulator` (slower), or use a USB phone with USB debugging.

## Project Structure

```
src/
├── components/   # Reusable UI components
├── screens/      # App screens (Auth, Collection, Settings)
├── services/     # Discogs API client
├── domain/       # Sorting, format filter, export (parity with Windows core/)
├── hooks/        # Custom React hooks
├── constants/    # App name / version (Spindle)
└── types/        # TypeScript interfaces
```

## Scripts

| Command   | Description              |
| --------- | ------------------------ |
| `npm start`   | Start Expo dev server    |
| `npm run android` | Build & run (phone if connected, else emulator) |
| `npm run android:device` | Build & run on USB/Wi‑Fi phone only (never starts emulator) |
| `npm run ios`     | Open in iOS simulator   |

## Release and testing

| Doc | Purpose |
|-----|---------|
| [docs/SMOKE_TEST_CHECKLIST.md](./docs/SMOKE_TEST_CHECKLIST.md) | Manual device checks before release |
| [docs/EAS_RELEASE.md](./docs/EAS_RELEASE.md) | Standalone APK/AAB via EAS (`preview` / `production`) |
| [docs/STORE_LISTING.md](./docs/STORE_LISTING.md) | Play Store listing draft |
| [docs/PRIVACY_POLICY.md](./docs/PRIVACY_POLICY.md) | Privacy policy draft |
| [MOBILE_PARITY_HANDOFF.md](./MOBILE_PARITY_HANDOFF.md) | Parity status and architecture |

Run `npm test` (41 tests) before merging. Enable **Show prices in list** in Settings (Pro) to see marketplace prices on collection rows.

## Related

- **Windows/Desktop app (Spindle)**: See sibling folder `discogs-vinyl-sorter-windows`
- **Implementation plan**: [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
