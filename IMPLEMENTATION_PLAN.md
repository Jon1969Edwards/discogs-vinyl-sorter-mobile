# Mobile Version – Implementation Plan (React Native)

Plan for building a mobile app that replicates Discogs Vinyl Sorter functionality in a **separate folder** (sibling to the Windows/Python project). Uses **React Native** so the same codebase targets **Android and iOS**.

---

## Overview

| Aspect | Windows (current) | Mobile (planned) |
|--------|-------------------|------------------|
| Language | Python 3.9+ | TypeScript (JavaScript) |
| Framework | CustomTkinter | React Native |
| UI | Desktop widgets | React Native components (e.g. React Native Paper or Tamagui) |
| Auth | PAT + OAuth (browser) | PAT + OAuth (WebBrowser / expo-auth-session) |
| Output | Local TXT/CSV/JSON files | Export, share, save to Downloads / Files app |
| Platform | Desktop | Phone/Tablet (Android + iOS) |

**Why React Native:** Same codebase for Android and iOS; hot reload; JavaScript/TypeScript ecosystem; Discogs API, list UIs, and file export are all well-suited to RN.

---

## Suggested Folder Structure

```
discogs-vinyl-sorter-windows/     ← existing
discogs-vinyl-sorter-mobile/      ← this folder (RN app)
```

Keep the mobile app fully separate from the Python codebase. No shared source code; logic will be reimplemented in TypeScript.

---

## Phase 1: Project Setup & Core Infrastructure

| # | Task | Details |
|---|------|---------|
| 1.1 | **Create React Native project** | `npx @react-native-community/cli init DiscogsVinylSorter` or Expo: `npx create-expo-app discogs-vinyl-sorter-mobile` |
| 1.2 | **Project structure** | `src/` with folders: `components/`, `screens/`, `services/` (API), `utils/` (sorting), `hooks/`, `types/` |
| 1.3 | **Dependencies** | axios (Discogs API), react-native-keychain (secure token storage), react-navigation (screens), react-native-paper or Tamagui (UI) |
| 1.4 | **Environment config** | Use `react-native-config` or `.env` with `DISCOGS_CONSUMER_KEY` / `DISCOGS_CONSUMER_SECRET` for OAuth; never commit secrets |

---

## Phase 2: Discogs API Layer

| # | Task | Details |
|---|------|---------|
| 2.1 | **API client** | axios instance with base URL `https://api.discogs.com`; endpoints: `identity`, `users/{user}/collection/folders/0/releases`, release details, marketplace prices |
| 2.2 | **Auth** | Support PAT via header; secure storage via `react-native-keychain` |
| 2.3 | **OAuth flow** | Use `expo-auth-session` or `react-native-webview` / `expo-web-browser` to open Discogs OAuth URL; handle callback via redirect URI / deep link; store access token + secret in Keychain/Keystore |
| 2.4 | **Rate limiting & retries** | Mirror Windows logic: respect `X-Discogs-Ratelimit-Remaining`, `Retry-After`, retry on 429/5xx with backoff (axios interceptors) |
| 2.5 | **User-Agent** | Set `User-Agent` header per Discogs requirements (e.g. `DiscogsVinylSorter/1.0` or similar) |

---

## Phase 3: Domain Logic (Reimplement)

| # | Task | Details |
|---|------|---------|
| 3.1 | **Models** | TypeScript interfaces: `ReleaseRow`, `BuildResult` equivalent; include artist, title, year, thumb/cover URLs, price fields |
| 3.2 | **LP filtering** | Same rules as Python: Vinyl + (LP or Album); optional strict 33 RPM; exclude 12" that are not LPs |
| 3.3 | **Sorting** | Reimplement sorting logic from `core/sorting.py`: artist → title → year, article stripping (The/A/An + extras), Discogs numeric suffix cleanup `(2)` |
| 3.4 | **Last-name-first** | Optional; conservative heuristic for two-word names; `lnf-safe-bands`, `lnf-allow-3`, `lnf-exclude` equivalents |
| 3.5 | **Various Artists** | Option to push to end (`--various-policy last`) |
| 3.6 | **45s & CDs** | Optional include; separate outputs (LP, 45, CD) if desired |

---

## Phase 4: UI – Core Screens

| # | Task | Details |
|---|------|---------|
| 4.1 | **Auth screen** | Sign in with OAuth or enter PAT; first-run check; store token securely |
| 4.2 | **Collection / shelf order screen** | `FlatList` with sorted LPs and thumbnails; `keyExtractor` for performance |
| 4.3 | **Refresh / auto-watch** | "Refresh now" button; optional `setInterval` when app foregrounded (battery-conscious) |
| 4.4 | **Search & filter** | `TextInput` + filtered list state; filter by artist/title |
| 4.5 | **Album detail** | Pressable row → detail screen/modal (artist, title, year, label, country, format, price, Discogs link) |
| 4.6 | **Settings** | Sort options (dividers, last-name-first, LP strict); export formats; AsyncStorage for preferences |

---

## Phase 5: Export & Sharing

| # | Task | Details |
|---|------|---------|
| 5.1 | **Export TXT/CSV** | Use `react-native-fs` or `expo-file-system` to write files; save to app document dir or share directly |
| 5.2 | **Export JSON** | Same structure as Windows `vinyl_shelf_order.json` |
| 5.3 | **Share** | Use `react-native-share` or `expo-sharing` to share TXT/CSV/JSON via email, Drive, etc. |
| 5.4 | **Print** | Optional; `react-native-print` or similar for text printing |

---

## Phase 6: Polish & Extras

| # | Task | Details |
|---|------|---------|
| 6.1 | **Wishlist tab** | Replicate wishlist logic from Windows app (folder 1 or equivalent); tab navigator or separate screen |
| 6.2 | **Manual reorder** | Drag-and-drop via `react-native-draggable-flatlist`; persist custom order with AsyncStorage |
| 6.3 | **Thumbnail cache** | `Image` component caches by default; for better control use `expo-image` or `react-native-fast-image` |
| 6.4 | **Price display** | Optional median/lowest price from Discogs marketplace |
| 6.5 | **Offline / cached view** | Store last fetched data in AsyncStorage/MMKV; show when offline; queue refresh when back online |
| 6.6 | **Dark / light theme** | Use `useColorScheme()` or react-native-paper theming; respect system preference |

---

## Phase 7: Quality & Distribution

| # | Task | Details |
|---|------|---------|
| 7.1 | **Unit tests** | Jest for sorting logic, article stripping, LP filtering (port tests from `test_sorting.py`); pure JS/TS, easy to test |
| 7.2 | **API mocking** | MSW or axios-mock-adapter for API integration tests |
| 7.3 | **Release build** | Android: `cd android && ./gradlew assembleRelease`; iOS: Xcode archive; EAS Build if using Expo |
| 7.4 | **Store listing** | Screenshots (both platforms), description, privacy policy (token storage, Discogs-only data) |
| 7.5 | **README** | Setup, env vars, OAuth app registration, `npm run android` / `npm run ios` |

---

## Technical Decisions to Make Early

1. **Expo vs bare React Native**  
   Expo: faster setup, OTA updates, easier builds; bare RN: more control. For this app, **Expo** is likely sufficient.

2. **OAuth vs PAT-only for v1**  
   PAT is simpler; OAuth improves UX ("Sign in with Discogs"). Recommend PAT for MVP, OAuth in Phase 2.

3. **Background sync**  
   Manual refresh for v1. Optional: `expo-background-fetch` for periodic refresh (battery-conscious).

4. **Monorepo vs separate repo**  
   Plan assumes **separate folder** (sibling). Could be same git repo with `discogs-vinyl-sorter-mobile/` or its own repo.

5. **Shared API spec**  
   Optionally define OpenAPI/JSON for Discogs endpoints used, to keep Windows and mobile aligned.

---

## Suggested Repository Layout (Same Repo, Separate Folder)

If both live in one repo:

```
discogs-vinyl-sorter/
├── windows/           ← current project (or keep root)
│   ├── core/
│   ├── autosort_gui.py
│   └── ...
├── mobile/            ← React Native app (Android + iOS)
│   ├── src/
│   ├── android/
│   ├── ios/
│   ├── package.json
│   └── app.json
└── README.md          ← links to both
```

If you prefer to keep the mobile app fully isolated:

```
D:\discogs-vinyl-sorter-windows\   ← as-is
D:\discogs-vinyl-sorter-mobile\    ← this folder, independent
```

---

## Effort Estimate (Rough)

| Phase | Effort |
|-------|--------|
| 1. Setup | 0.5–1 day |
| 2. API | 1–2 days |
| 3. Domain | 1–2 days |
| 4. UI core | 3–5 days |
| 5. Export | 0.5–1 day |
| 6. Polish | 2–3 days |
| 7. Quality & distribution | 1–2 days |
| **Total** | **~10–16 days** |

---

## Next Steps

1. Choose Expo vs bare React Native; create project with `npx create-expo-app` or `npx @react-native-community/cli init`.
2. Implement Phase 1–2 (setup + API) first.
3. Add one minimal screen (auth + fetch + list) to validate end-to-end flow.
4. Iterate with sorting, export, and UI polish.

---

*Plan created: 2025-02-14*
