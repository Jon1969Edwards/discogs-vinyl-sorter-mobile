# Device smoke test checklist

Run after merging to `main` or before an EAS release build. Requires the **dev client** APK (not Expo Go) and the same Wi‑Fi as your PC.

## Setup

1. On PC: `npm run start:lan` (if port 8081 is busy, stop the old Metro process first).
2. On phone: open **Discogs Vinyl Sorter** dev app → connect to `http://<PC_LAN_IP>:8081` (e.g. `http://192.168.50.166:8081`).
3. Automated gate (PC): `npm test` — all **33** tests should pass.

## Checklist

| Step | Action | Pass? |
|------|--------|-------|
| 1 | Sign in (OAuth or PAT) | |
| 2 | Collection loads (LP count matches expectation) | |
| 3 | Pull-to-refresh on Collection | |
| 4 | Settings → change currency → **Done** → repricing banner completes | |
| 5 | Album detail shows price in selected currency (not hardcoded `$`) | |
| 6 | Open **Blitz** (or any release with collection notes) — no crash | |
| 7 | Export TXT from Collection (share sheet opens) | |
| 8 | Optional: Reorder shelf → Done → order persists | |
| 9 | Optional: Wishlist tab loads | |

## If something fails

- **Cannot connect to Metro:** use LAN URL, not tunnel; check firewall on port 8081.
- **Currency reverts:** tap **Done** or **Save currency** in Settings (not only system back).
- **Prices still in USD:** wait for repricing banner; pull-to-refresh collection.

Record date, build/commit, and any failures in your release notes before `eas build`.
