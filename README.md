# Discogs Vinyl Sorter – Mobile

React Native (Expo) app that replicates the Discogs Vinyl Sorter for Android and iOS. Connects to the Discogs API, fetches your collection, sorts LPs by artist/title/year, and lets you export TXT/CSV/JSON.

## Prerequisites

- **Node.js 18+** – [nodejs.org](https://nodejs.org)
- **npm** or **yarn**
- **Expo Go** app on your phone (for development)
- **Discogs Personal Access Token** or OAuth app credentials

## Setup

1. Install dependencies:

```bash
npm install
```

2. (Optional) For OAuth, copy `.env.example` to `.env` and add your Discogs app credentials:

```
DISCOGS_CONSUMER_KEY=your_key
DISCOGS_CONSUMER_SECRET=your_secret
```

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
