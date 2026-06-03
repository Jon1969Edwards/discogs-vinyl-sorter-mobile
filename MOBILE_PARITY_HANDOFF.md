# Mobile–Windows Parity Handoff

## Repos and roles

| Repo | Path | Role |
|------|------|------|
| **Windows (reference)** | `F:\Dev\discogs-vinyl-sorter-windows` | Source of truth: `core/` + Auto-Sort GUI (`autosort_gui.py`) |
| **Mobile (port)** | `F:\Dev\discogs-vinyl-sorter-mobile` | Expo/React Native TypeScript port with Jest golden tests |

**Parity target:** Windows **Auto-Sort GUI**, not CLI-only defaults.

**Windows commit at handoff:** `43141fcaaa671d89de17126937e2ffcc5c3cb179` (`develop` / ABC dividers + sorting fixes)

---

## Parity contract (summary)

1. **Collection pipeline:** Fetch all releases → tag `format_categories` → filter by saved `formats` (default `lp`) → sort with GUI build options (`lastNameFirst`, `lnfSafeBands`, `lnfAllow3=false`, `variousPolicy=normal`).
2. **Export:** TXT/CSV/JSON matching Windows `core/export.py`; `divider_mode`: `none` | `letter` | `abc`.
3. **Config keys** (AsyncStorage `discogs_app_settings`): `formats`, `divider_mode`, `sort_by`, `currency`, `write_json`, `poll_seconds`, `show_prices`, `user_agent`, `per_page`.
4. **Auth:** PAT (validated via `/oauth/identity`) + OAuth 1.0a (`discogvinylsorter://callback`).
5. **Wishlist:** Local storage + sync from Discogs wantlist on collection build.
6. **Watch:** Foreground poll on collection item count (`poll_seconds`, default 300).
7. **Prices:** Marketplace stats when `show_prices` or price sort; 7-day price cache TTL in collection cache service.

---

## File mapping (Windows → Mobile)

| Windows | Mobile |
|---------|--------|
| `core/sorting.py` | `src/domain/sorting.ts` |
| `core/format_filter.py` | `src/domain/formatFilter.ts` |
| `core/export.py` | `src/domain/export.ts` |
| `core/api.py` | `src/services/discogsApi.ts` |
| `core/oauth_discogs.py` | `src/services/oauthDiscogs.ts` |
| `core/build_service.py` (cache, count, build) | `src/services/collectionCache.ts`, `src/hooks/useCollection.ts` |
| `autosort_gui.py` ManualOrderManager | `src/services/manualOrder.ts` |
| `core/wishlist.py` / wantlist API | `src/services/wishlist.ts` |
| `gui/settings_panel.py` | `src/screens/SettingsScreen.tsx` |
| `gui/wishlist_panel.py` | `src/screens/WishlistScreen.tsx` |
| `gui/thumbnails.py` | `src/services/thumbnailCache.ts` |
| `.discogs_config.json` | AsyncStorage `discogs_app_settings` |
| Secure token / OAuth | `expo-secure-store` (`src/services/auth.ts`) |
| Export / print files | `src/services/exportShare.ts` (share sheet) |
| `test_sorting.py` | `__tests__/sorting.test.ts` |
| `test_format_filter.py` | `__tests__/formatFilter.test.ts` |
| `test_export_dividers.py` | `__tests__/exportDividers.test.ts` |

---

## Phase checklist

### Phase A — Domain + tests
- [x] `src/domain/` sorting, formatFilter, export (ABC dividers)
- [x] Jest golden tests from Windows
- [x] `useCollection` fetch-all → filter → GUI sort

### Phase B — Settings + auth
- [x] Settings screen + AsyncStorage
- [x] OAuth (`expo-web-browser` + `discogvinylsorter://callback`)
- [x] PAT validated with `getIdentity` before save

### Phase C — Collection UX
- [x] Bottom tabs: Shelf | Wishlist | Settings
- [x] Album detail modal + wishlist add/remove
- [x] Manual reorder (`react-native-draggable-flatlist`)
- [x] Prices in list when `show_prices`
- [x] Thumbnail file cache

### Phase D — Watch + cache
- [x] Collection cache schema + item count
- [x] Foreground poll (`useCollectionWatch`)
- [x] Wishlist sync on build

### Phase E — Release hardening (partial)
- [ ] EAS Build profiles / store assets polish
- [x] Handoff doc (this file)
- [ ] Update `IMPLEMENTATION_PLAN.md` status matrix (optional follow-up)

---

## Known intentional differences

| Windows | Mobile |
|---------|--------|
| Local `vinyl_shelf_order.txt` | System share sheet via `expo-sharing` |
| OAuth `http://127.0.0.1:8765/callback` | `discogvinylsorter://callback` |
| `CTk` settings panel | Settings tab |
| Treeview drag reorder | `DraggableFlatList` long-press drag |
| Print via Notepad | Not available |
| Obfuscated JSON config | SecureStore (tokens) + AsyncStorage (prefs) |
| `show_prices` cleared on launch | Persisted; user toggles in Settings |

---

## OAuth setup

Register a Discogs application at [discogs.com/settings/developers](https://www.discogs.com/settings/developers).

| Platform | Callback URL |
|----------|----------------|
| Windows | `http://127.0.0.1:8765/callback` |
| Mobile | `discogvinylsorter://callback` |

Mobile `.env` (see `.env.example`):

```
DISCOGS_CONSUMER_KEY=...
DISCOGS_CONSUMER_SECRET=...
```

See `docs/OAUTH_SETUP.md` in the mobile repo.

---

## Test commands

**Windows** (from `discogs-vinyl-sorter-windows`):

```bash
python test_sorting.py
python test_format_filter.py
python test_export_dividers.py
```

**Mobile** (from `discogs-vinyl-sorter-mobile`):

```bash
npm install
npm test
```

When Windows `core/sorting.py`, `format_filter.py`, or `export.py` change, update the matching `src/domain/*.ts` files and golden tests in the same session.

---

## Sync protocol

1. Make behavioral change on Windows `core/` with tests.
2. Port logic to `src/domain/` on mobile.
3. Update or add cases in `__tests__/*.test.ts`.
4. Run `npm test` and Windows `python test_*.py`.
5. Note paired commits in PR description or `PARITY.md` (optional).

---

## Open questions (deferred)

- Country/label exclusion (Windows UI backlog #4) — not in mobile v1.
- Desktop-only: print, Spotify, PyInstaller — out of scope.
- CLI-only flags — only if added to Settings “Advanced” later.
