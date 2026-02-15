#!/usr/bin/env node
/**
 * Resets ADB and cold-boots the Android emulator.
 * Use when you get "device offline" or adb connection issues.
 */
const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const localPropsPath = path.join(projectRoot, 'android', 'local.properties');

let sdkDir = process.env.ANDROID_HOME;
if (!sdkDir && fs.existsSync(localPropsPath)) {
  const content = fs.readFileSync(localPropsPath, 'utf8');
  const match = content.match(/sdk\.dir=(.+)/);
  if (match) sdkDir = match[1].trim().replace(/\\/g, '/');
}

if (!sdkDir || !fs.existsSync(sdkDir)) {
  console.error('Android SDK not found.');
  process.exit(1);
}

const adb = path.join(sdkDir, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const emulator = path.join(sdkDir, 'emulator', process.platform === 'win32' ? 'emulator.exe' : 'emulator');

console.log('Stopping ADB server...');
spawnSync(adb, ['kill-server'], { stdio: 'inherit' });

// Close any running emulator
spawnSync(adb, ['emu', 'kill'], { stdio: 'pipe' });

console.log('Starting ADB server...');
spawnSync(adb, ['start-server'], { stdio: 'inherit' });

const listResult = spawnSync(emulator, ['-list-avds'], { encoding: 'utf8' });
const avds = listResult.stdout?.trim().split('\n').filter(Boolean) || [];
const avd = avds.find((a) => a.includes('Medium_Phone')) || avds[0];

if (!avd) {
  console.error('No AVD found. Create one in Android Studio → Device Manager.');
  process.exit(1);
}

console.log('Starting emulator (cold boot)...');
console.log('Wait 60-90 seconds for it to fully boot, then run: npm run android\n');
spawn(emulator, ['-avd', avd, '-no-snapshot-load'], {
  detached: true,
  stdio: 'ignore',
}).unref();
