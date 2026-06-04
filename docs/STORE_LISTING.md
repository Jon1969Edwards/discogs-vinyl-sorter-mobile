# Google Play store listing (draft)

Fill in bracketed placeholders before submission.

## App name

Discogs Vinyl Sorter

## Short description (80 chars max)

Sort your Discogs vinyl collection for the shelf. Export TXT, CSV, or JSON.

## Full description

Discogs Vinyl Sorter fetches your Discogs collection, filters to the formats you care about (LP by default), and sorts it the same way as the desktop Vinyl Sorter — including last-name-first artist order and optional A–Z or shelf dividers.

**Features**

- Sign in with Discogs OAuth or a Personal Access Token
- Collection list with search, section letters, and thumbnails
- Optional marketplace lowest prices (multiple currencies)
- Manual shelf reorder with persistent custom order
- Export sorted list as TXT, CSV, or JSON via Android share
- Wishlist tab synced from Discogs

**Requirements**

- A Discogs account and API credentials (OAuth app or PAT)
- Internet connection to load and refresh your collection

Not affiliated with or endorsed by Discogs.

## Category

Music & Audio (or Books & Reference)

## Privacy policy URL

Host `docs/PRIVACY_POLICY.md` on GitHub Pages or your site, then paste the public URL here.

## Screenshots (capture on device)

Suggested shots (1080×1920 or 1080×2340):

1. Collection list with LP count and search
2. Settings (formats + currency)
3. Album detail with price
4. Export share sheet
5. Wishlist tab (optional)

Place PNGs in `assets/store/` when ready (folder not required for dev builds).

## Content rating

Complete Play questionnaire — expect “Everyone” or low maturity; no user-generated public content in-app.

## Data safety (Play Console)

Declare:

- Data collected: account info (Discogs token) — required for core function
- Data shared: none (direct to Discogs API only)
- Encryption in transit: yes (HTTPS)
- Users can request deletion: sign out + clear app data

## Checklist before submit

- [ ] Smoke test on **preview/production** APK ([SMOKE_TEST_CHECKLIST.md](./SMOKE_TEST_CHECKLIST.md))
- [ ] Privacy policy URL live
- [ ] `version` bumped in `app.json`
- [ ] `eas build --profile production` succeeded
- [ ] `eas submit` or manual AAB upload
