# Develop without the Android emulator

If the emulator will not boot (VT-x off, black screen, QEMU crash), you can run this app **without any emulator**. You need either a **physical Android phone** or a **one-time cloud build** of the dev client APK.

Expo Go does **not** work for this repo (native modules: gesture-handler, reanimated, draggable list).

---

## Path A — USB phone (recommended, free)

Your PC compiles the native app and installs it on the phone. **No emulator, no BIOS change.**

### 1. Phone setup

1. **Settings → About phone** → tap **Build number** 7 times → Developer options unlock.
2. **Developer options** → enable **USB debugging**.
3. Plug in USB. On the phone, tap **Allow USB debugging** (check “Always allow” if offered).
4. USB mode: choose **File transfer / MTP**, not “Charge only”.

### 2. Verify ADB sees the phone

```powershell
cd F:\Dev\discogs-vinyl-sorter-mobile
$sdk = "$env:LOCALAPPDATA\Android\Sdk"
& "$sdk\platform-tools\adb.exe" devices
```

You must see something like:

```text
XXXXXXXX    device
```

If you see `unauthorized`, unlock the phone and accept the prompt. If `offline`, unplug/replug or try another cable/port.

### 3. First install (one-time native build, ~10–20 min)

```powershell
npm run android:device
```

This runs `expo run:android` and installs **Discogs Vinyl Sorter** (dev client) on the phone. It **will not** start an emulator.

### 4. Daily JavaScript work

```powershell
npm start
```

On the phone, open **Discogs Vinyl Sorter** (not Expo Go). Shake device or use the dev menu to reload after code changes.

---

## Path B — Wi‑Fi debugging (no USB cable after pairing)

Android 11+:

1. **Developer options → Wireless debugging** → On.
2. **Pair device with pairing code** → note IP, port, and code.
3. On PC:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" pair IP:PAIR_PORT
# enter pairing code when prompted
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" connect IP:DEBUG_PORT
adb devices
```

Then `npm run android:device` and `npm start` as in Path A.

---

## Path C — EAS cloud build (no local compile, no emulator)

Use this if you **do not** have a USB cable handy or local Gradle fails. Expo builds the APK in the cloud; you install it on any Android phone.

### 1. Expo account and CLI

```powershell
npm install -g eas-cli
eas login
eas whoami
```

### 1b. Permission denied on build?

If you see `Entity not authorized` for project id `1658702c-...`, the repo is linked to **`jonathan-charles-edwards`** but you are logged in as someone else.

Pick one:

- **Same person, wrong login:** `eas logout` → `eas login` with the account that owns that Expo project.
- **Your own Expo account (typical):** re-link the app (once):

```powershell
cd F:\Dev\discogs-vinyl-sorter-mobile
# Remove "owner" and extra.eas.projectId from app.json (or run the script below), then:
eas init
```

Answer the prompts to **create a new project** under your user. Then continue with the build.

### 2. Build development client

```powershell
cd F:\Dev\discogs-vinyl-sorter-mobile
eas build --profile development --platform android
```

When the build finishes, open the build link on your phone, download the **APK**, and install (allow “Install unknown apps” for the browser if asked).

If EAS asks **“Install and run on an emulator?”** → answer **No** (your PC emulator needs VT-x in BIOS). The APK is already built; install it on a **physical phone** from the link instead.

**Gradle failed on EAS with invalid `org.gradle.java.home`?** Remove any Windows JDK path from `android/gradle.properties` (committed file must not pin `C:/...`). Use `JAVA_HOME` locally instead; see `android/gradle.properties.local.example`.

### 3. Run Metro on your PC

```powershell
npm start
```

Open **Discogs Vinyl Sorter** on the phone. Prefer **same Wi‑Fi + LAN** (see below). Tunnel is optional.

Rebuild the dev client only when you change native dependencies or `app.json` plugins — not for normal TS/React edits.

### Tunnel failed: `Cannot read properties of undefined (reading 'body')`

Expo’s built-in tunnel uses ngrok (`*.exp.direct`). That error usually means **ngrok rejected the session** (Expo shared limit, outage, or missing package)—not a bug in this app.

**Use LAN instead (recommended):**

```powershell
npm run start:lan
# or: npx expo start --dev-client --lan --clear
```

On the phone dev client, connect to `http://YOUR_PC_IP:8081` (from `ipconfig`, e.g. `http://192.168.50.166:8081`).

**If you need tunnel** (phone on cellular / different network):

1. Project includes `@expo/ngrok` as a dev dependency—retry `npm run start:tunnel`.
2. If it still fails, use your own ngrok account:
   - `npx expo start --dev-client --lan`
   - In another terminal: `ngrok http 8081` (with your authtoken from [ngrok dashboard](https://dashboard.ngrok.com/))
   - Set `EXPO_PACKAGER_PROXY_URL` to the ngrok `https://…` URL, restart Metro, connect the dev app to that URL.

Check [ngrok status](https://status.ngrok.com/) and [Expo issue #43335](https://github.com/expo/expo/issues/43335) for service-side limits.

### Red screen: `RNGestureHandlerModule could not be found`

The APK was built from an outdated `android/` tree (native modules not linked), or you used **Expo Go** instead of **Discogs Vinyl Sorter**. This project requires **`newArchEnabled=true`** (Reanimated 4.x); do not set it to `false`.

1. Uninstall both **Expo Go** and **Discogs Vinyl Sorter** on the phone.
2. Rebuild with a clean cache:

```powershell
eas build --profile development --platform android --clear-cache
```

3. Install only the **new** APK from that build page.
4. `npm run start:lan` → connect with `http://YOUR_PC_IP:8081` (not `localhost`).

---

## Path D — Browser (limited)

```powershell
npm run web
```

Useful for quick UI checks. **Not** full parity: drag-reorder and some native flows may differ or be missing.

---

## What does *not* help on your PC

| Approach | Why |
| -------- | --- |
| Expo Go | Missing native modules |
| `$env:ACCEL_OFF="1"` emulator | Still needs VT-x for reliable x86_64 API 36 |
| Another AVD | Same hypervisor requirement |
| Waiting on black emulator | `adb` shows `offline` — guest never booted |

---

## Commands cheat sheet

| Goal | Command |
| ---- | ------- |
| Build/install to phone only | `npm run android:device` |
| Metro for dev client | `npm start` |
| Cloud APK (no local build) | `eas build --profile development --platform android` |
| Check phone connection | `adb devices` |
