#!/usr/bin/env node
/**
 * Runs expo run:android with ANDROID_HOME set from local.properties.
 * Resets ADB to fix "device offline", waits for emulator if needed.
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
  console.error('Android SDK not found. Create android/local.properties with sdk.dir=...');
  process.exit(1);
}

process.env.ANDROID_HOME = sdkDir;
const pathSep = process.platform === 'win32' ? ';' : ':';
process.env.PATH = [
  path.join(sdkDir, 'platform-tools'),
  path.join(sdkDir, 'emulator'),
  process.env.PATH,
].join(pathSep);

const adb = path.join(sdkDir, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const emulator = path.join(sdkDir, 'emulator', process.platform === 'win32' ? 'emulator.exe' : 'emulator');

function resetAdb() {
  spawnSync(adb, ['kill-server'], { stdio: 'pipe' });
  spawnSync(adb, ['start-server'], { stdio: 'pipe' });
}

function getReadyDevices() {
  const result = spawnSync(adb, ['devices'], { encoding: 'utf8' });
  const lines = (result.stdout || '').split('\n').slice(1);
  return lines
    .map((line) => line.trim().split(/\s+/))
    .filter(([id, status]) => id && status === 'device')
    .map(([id]) => id);
}

function listAvds() {
  const result = spawnSync(emulator, ['-list-avds'], { encoding: 'utf8' });
  return (result.stdout || '').trim().split('\n').filter(Boolean);
}

(async () => {
  // Reset ADB first - fixes "device offline" from stale connections
  resetAdb();
  await new Promise((r) => setTimeout(r, 3000));

  let devices = getReadyDevices();
  if (devices.length > 0) {
    const device = devices[0];
    console.log(`Using device: ${device}\n`);
    const child = spawn('npx', ['expo', 'run:android', '-d', device], {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: false,
    });
    child.on('exit', (code) => process.exit(code ?? 0));
    return;
  }

  // No device - kill any stuck emulator, then cold boot a fresh one
  spawnSync(adb, ['emu', 'kill'], { stdio: 'pipe' });
  resetAdb();
  await new Promise((r) => setTimeout(r, 2000));

  const avds = listAvds();
  const avd = avds.find((a) => a.includes('Medium_Phone')) || avds[0];
  if (!avd) {
    console.error('No AVD found. Create one in Android Studio → Device Manager.');
    process.exit(1);
  }

  console.log('No device connected. Cold-booting emulator (this may take 2–3 min)...');
  spawn(emulator, ['-avd', avd, '-no-snapshot-load'], { detached: true, stdio: 'ignore' }).unref();

  const maxWait = 180000; // 3 minutes
  const pollInterval = 5000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, pollInterval));
    devices = getReadyDevices();
    if (devices.length > 0) {
      console.log(`\nEmulator ready: ${devices[0]}\n`);
      const child = spawn('npx', ['expo', 'run:android', '-d', devices[0]], {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: false,
      });
      child.on('exit', (code) => process.exit(code ?? 0));
      return;
    }
  }

  console.error('\nEmulator failed to start in time.');
  console.error('1. Close any open emulator window');
  console.error('2. Run: npm run android:emulator');
  console.error('3. Wait until the home screen appears, then run: npm run android');
  process.exit(1);
})();
