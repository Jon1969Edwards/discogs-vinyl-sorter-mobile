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
   - Add callback URL: `discogvinylsorter://oauth/callback`
   - Add your consumer key and secret to `.env`

3. Start the development server:

```bash
npm start
```

4. Scan the QR code with Expo Go (Android) or the Camera app (iOS).

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
