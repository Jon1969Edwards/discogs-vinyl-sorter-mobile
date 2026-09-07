# OAuth Sign-In Setup (Mobile)

## For app users

1. Tap **Sign in with Discogs** on the auth screen (requires OAuth credentials in the build).
2. Approve the app in the browser.
3. Return to the app — you are signed in.

If OAuth is not configured, use **Advanced: use Personal Access Token** and paste a token from [Discogs Developers](https://www.discogs.com/settings/developers). The app verifies the token with Discogs before saving.

## For developers

1. Create a Discogs application at [discogs.com/settings/developers](https://www.discogs.com/settings/developers).
2. Set **Application Name** to `Spindle` (or `Spindle Mobile`).
3. Set **Callback URL** to: `discogvinylsorter://callback`
4. Copy Consumer Key and Consumer Secret into `.env`:

```
DISCOGS_CONSUMER_KEY=your_key
DISCOGS_CONSUMER_SECRET=your_secret
```

5. Ensure `app.json` includes `"scheme": "discogvinylsorter"` (unchanged from legacy package id — do not rename without updating Discogs + rebuilding native clients).
6. Rebuild or restart Expo after changing `.env`.

## Windows vs mobile callbacks

| App | Callback |
|-----|----------|
| Windows desktop | `http://127.0.0.1:8765/callback` |
| Mobile (this app) | `discogvinylsorter://callback` |

You may use one Discogs application with **both** callback URLs registered, or separate apps per platform.
