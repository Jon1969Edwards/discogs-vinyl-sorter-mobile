# Privacy policy — Discogs Vinyl Sorter (mobile)

**Last updated:** 2026-06-04  
**App:** Discogs Vinyl Sorter (Android)  
**Contact:** Replace with your support email before publishing to Google Play.

## Summary

This app helps you sort and export your Discogs vinyl collection. It talks only to the **Discogs API** using credentials you provide. We do not operate a separate backend server for your collection data.

## Data we access

| Data | Purpose | Stored where |
|------|---------|--------------|
| Discogs OAuth token or Personal Access Token | Authenticate API requests | Device secure storage (Expo SecureStore on Android) |
| Collection metadata (artists, titles, years, labels, etc.) | Display and sort your shelf | Device (AsyncStorage cache) |
| Marketplace lowest prices (optional) | Display when you enable prices | Device cache (7-day TTL per currency) |
| App settings (formats, sort, currency, etc.) | Your preferences | Device (AsyncStorage) |

## Data we do not collect

- We do not sell or share your data with advertisers.
- We do not upload your collection to our own servers.
- We do not access contacts, photos, or location unless you add such features later.

## Third parties

- **Discogs** — API provider; subject to [Discogs Terms of Use](https://support.discogs.com/hc/en-us/articles/360009334593-Terms-of-Service) and their privacy practices.
- **Expo / EAS** — If you install a build from Expo Application Services, build logs are handled by Expo per their policies.

## Your choices

- **Sign out** removes stored credentials from the device.
- **Clear app data** (Android settings) removes cached collection and settings.
- You can revoke OAuth or PAT tokens anytime in Discogs account settings.

## Security

Tokens are stored in the platform secure store where available. Use a device passcode/biometrics to protect your phone.

## Children

The app is not directed at children under 13.

## Changes

We may update this policy when the app changes. The “Last updated” date will change accordingly.

## Contact

For privacy questions, contact: **[your-email@example.com]**
