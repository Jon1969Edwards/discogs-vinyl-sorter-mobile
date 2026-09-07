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
const licenseSecret = (process.env.VSS_LICENSE_SECRET || '').trim();
const devPro = (process.env.SPINDLE_DEV_PRO || process.env.VSS_DEV_PRO || '').trim();

if (!key && !secret && !licenseSecret && !devPro) {
  console.log('eas-write-env: no DISCOGS_* / license env vars; skipping .env');
  process.exit(0);
}

const lines = [
  '# Generated on EAS Build from project environment variables',
  `DISCOGS_CONSUMER_KEY=${key}`,
  `DISCOGS_CONSUMER_SECRET=${secret}`,
];
if (licenseSecret) {
  lines.push(`VSS_LICENSE_SECRET=${licenseSecret}`);
}
if (devPro) {
  lines.push(`SPINDLE_DEV_PRO=${devPro}`);
}
lines.push('');

fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
console.log('eas-write-env: wrote .env (secrets not logged)');
