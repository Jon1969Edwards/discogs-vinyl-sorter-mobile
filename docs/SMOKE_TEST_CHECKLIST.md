# Device smoke test checklist

Run after merging to `main` or before an EAS release build. Requires the **dev client** APK (not Expo Go) and the same Wi‑Fi as your PC.

## Setup

1. On PC: `npm run start:lan` (if port 8081 is busy, stop the old Metro process first).
2. On phone: open **Spindle** dev app → connect to `http://<PC_LAN_IP>:8081` (e.g. `http://192.168.50.166:8081`).
3. Automated gate (PC): `npm test` — all **49** tests should pass.

## Checklist

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Sign in (OAuth or PAT) | |
| 2 | Collection loads (LP count matches expectation) | |
| 3 | Pull-to-refresh on Collection | |
| 4 | Free: collection / export capped at 100 with Pro banner when truncated | |
| 5 | Settings → Upgrade to Pro → paste `VSS1-…` key → Pro status | |
| 6 | Pro: enable Show prices → list prices; album detail shows currency price | |
| 7 | Free: Reorder / A/B/C / price sort → soft upsell (not crash) | |
| 8 | Album detail: Add/Remove wishlist; Open on Discogs; Open on Spotify | |
| 8b | Settings → Sort by **Genre**; list regroups; Unknown last | |
| 8c | Album detail → **Edit genre** → save; list updates; pull-to-refresh keeps the edit | |
| 8d | Edit genre → **Reset to original** restores Discogs genre | |
| 8e | Settings → **Export genre edits** / **Import genre edits** (clipboard or Android folder with `genre_overrides.json`) | |
| 9 | Export TXT → share sheet; note that file saved when “Save last export” on | |
| 10 | Airplane mode → cached collection banner with last sync time | |
| 11 | Optional: Deactivate Pro → Free limits return | |

## If something fails

- **Cannot connect to Metro:** use LAN URL, not tunnel; check firewall on port 8081.
- **Currency reverts:** tap **Done** or **Save currency** in Settings (not only system back).
- **Prices still in USD:** wait for repricing banner; pull-to-refresh collection.
- **License invalid:** confirm `VSS_LICENSE_SECRET` matches the key’s signing secret (dev default only in `__DEV__`).

Record date, build/commit, and any failures in your release notes before `eas build`.
