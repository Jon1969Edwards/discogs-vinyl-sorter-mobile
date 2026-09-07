/**
 * EAS Build: write .env from project environment variables so
 * babel react-native-dotenv can embed DISCOGS_* at compile time.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');

const key = (process.env.DISCOGS_CONSUMER_KEY || '').trim();
const secret = (process.env.DISCOGS_CONSUMER_SECRET || '').trim();

if (!key && !secret) {
  console.log('eas-write-env: no DISCOGS_* env vars; skipping .env');
  process.exit(0);
}

const lines = [
  '# Generated on EAS Build from project environment variables',
  `DISCOGS_CONSUMER_KEY=${key}`,
  `DISCOGS_CONSUMER_SECRET=${secret}`,
  '',
];

fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
console.log('eas-write-env: wrote .env for OAuth (keys not logged)');
