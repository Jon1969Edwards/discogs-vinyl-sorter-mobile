#!/usr/bin/env node
/**
 * Start the Android emulator (keeps window open). Wait for home screen, then npm run android.
 */
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const {
  resolveSdkDir,
  sdkTools,
  prependSdkToPath,
} = require('./android-sdk');

const projectRoot = path.resolve(__dirname, '..');
const sdkDir = resolveSdkDir(projectRoot);

if (!sdkDir) {
  console.error('Android SDK not found. See android/local.properties.example');
  process.exit(1);
}

prependSdkToPath(sdkDir);
const { adb, emulator } = sdkTools(sdkDir);

console.log('Stopping ADB server...');
spawnSync(adb, ['kill-server'], { stdio: 'inherit' });
spawnSync(adb, ['emu', 'kill'], { stdio: 'pipe' });
console.log('Starting ADB server...');
spawnSync(adb, ['start-server'], { stdio: 'inherit' });

const listResult = spawnSync(emulator, ['-list-avds'], { encoding: 'utf8' });
const avds = listResult.stdout?.trim().split('\n').filter(Boolean) || [];
const avd =
  process.env.ANDROID_AVD ||
  avds.find((a) => a.includes('Medium_Phone')) ||
  avds[0];

if (!avd) {
  console.error('No AVD found. Create one in Android Studio → Device Manager.');
  process.exit(1);
}

const coldBoot = process.env.COLD_BOOT === '1';
const args = ['-avd', avd];
if (coldBoot) args.push('-no-snapshot-load');
if (process.platform === 'win32') args.push('-gpu', 'swiftshader_indirect');

console.log(`Starting emulator: ${avd}${coldBoot ? ' (cold boot)' : ''}`);
console.log('Wait until the Android home screen appears, then run: npm run android\n');

spawn(emulator, args, {
  detached: true,
  stdio: 'ignore',
}).unref();
