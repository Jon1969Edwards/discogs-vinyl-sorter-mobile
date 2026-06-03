#!/usr/bin/env node
/**
 * Runs expo run:android with ANDROID_HOME set from local.properties.
 * Waits for emulator boot (boot_completed) or uses an already-connected device/USB phone.
 */
const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');
const {
  resolveSdkDir,
  sdkTools,
  prependSdkToPath,
  pickAvd,
  readAvdAbi,
  readEmulatorFatal,
} = require('./android-sdk');

const projectRoot = path.resolve(__dirname, '..');
const sdkDir = resolveSdkDir(projectRoot);

if (!sdkDir) {
  console.error('Android SDK not found. Create android/local.properties with sdk.dir=...');
  console.error('  Example: copy android/local.properties.example → android/local.properties');
  process.exit(1);
}

prependSdkToPath(sdkDir);
const { adb, emulator } = sdkTools(sdkDir);

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

function isBootCompleted() {
  const r = spawnSync(adb, ['shell', 'getprop', 'sys.boot_completed'], {
    encoding: 'utf8',
    timeout: 15000,
  });
  return (r.stdout || '').trim() === '1';
}

async function waitForEmulatorReady(maxMs) {
  const pollMs = 4000;
  const start = Date.now();
  let sawDevice = false;

  while (Date.now() - start < maxMs) {
    const devices = getReadyDevices();
    if (devices.length > 0) {
      sawDevice = true;
      if (isBootCompleted()) return devices[0];
    } else if (sawDevice) {
      // Device vanished — keep polling
      sawDevice = false;
    }
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return null;
}

function runExpoAndroid() {
  const expoCli = path.join(projectRoot, 'node_modules', 'expo', 'bin', 'cli');
  const child = spawn(process.execPath, [expoCli, 'run:android'], {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, ANDROID_HOME: sdkDir },
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

function startEmulator(avd) {
  const coldBoot = process.env.COLD_BOOT === '1';
  const args = ['-avd', avd, '-no-boot-anim'];
  if (coldBoot) args.push('-no-snapshot-load');
  // Software GPU is more reliable on Windows when HW acceleration fails silently.
  if (process.platform === 'win32') args.push('-gpu', 'swiftshader_indirect');

  const logDir = path.join(projectRoot, 'android');
  const logFile = path.join(logDir, 'emulator-last.log');
  const out = fs.openSync(logFile, 'a');
  fs.writeSync(out, `\n--- ${new Date().toISOString()} starting ${avd} ---\n`);

  const child = spawn(emulator, args, {
    detached: true,
    stdio: ['ignore', out, out],
  });
  child.unref();
  return logFile;
}

(async () => {
  resetAdb();
  await new Promise((r) => setTimeout(r, 2000));

  let devices = getReadyDevices();
  if (devices.length > 0) {
    console.log(`Using device: ${devices[0]}\n`);
    if (!isBootCompleted()) {
      console.log('Waiting for device to finish booting...');
      const ready = await waitForEmulatorReady(120000);
      if (!ready) {
        console.error('Device connected but Android did not finish booting.');
        process.exit(1);
      }
    }
    runExpoAndroid();
    return;
  }

  const avd = pickAvd(emulator);

  if (!avd) {
    console.error('No AVD found. Create one in Android Studio → Device Manager.');
    console.error('  On Intel/AMD PCs use a system image with ABI x86_64 (not arm64).');
    process.exit(1);
  }

  const abi = readAvdAbi(avd);

  console.log('No device connected. Starting emulator...');
  console.log(`  AVD: ${avd}${abi ? ` (${abi})` : ''}`);
  console.log('  Tip: set ANDROID_AVD=Pixel_9a to pick another AVD');
  console.log('  Tip: plug in a USB phone (USB debugging) and re-run to skip the emulator\n');

  spawnSync(adb, ['emu', 'kill'], { stdio: 'pipe' });
  await new Promise((r) => setTimeout(r, 1500));

  const logFile = startEmulator(avd);
  const maxWait = Number(process.env.EMULATOR_BOOT_TIMEOUT_MS) || 360000; // 6 min
  console.log(`Booting (up to ${Math.round(maxWait / 60000)} min; dots = still waiting)...`);

  const deviceId = await waitForEmulatorReady(maxWait);
  if (!deviceId) {
    console.error('\nEmulator did not become ready in time.');
    console.error(`  Log: ${logFile}`);
    const fatal = readEmulatorFatal(logFile);
    if (fatal) console.error(`  ${fatal}`);
    if (fatal && fatal.includes("'arm'")) {
      console.error(
        '  Your PC needs an x86_64 AVD (Android Studio → Device Manager → create Virtual Device → x86_64 system image).'
      );
    }
    console.error('\nTry:');
    console.error('  1. npm run android:emulator   (wait for home screen in the emulator window)');
    console.error('  2. npm run android');
    console.error('  Or: Android Studio → Device Manager → run the AVD manually, then npm run android');
    console.error('  Or: USB phone with Developer options → USB debugging enabled');
    console.error('  Slow PC cold boot: set COLD_BOOT=1 only when needed; default uses snapshots (faster)');
    process.exit(1);
  }

  console.log(`\nEmulator ready: ${deviceId}`);
  await new Promise((r) => setTimeout(r, 3000));
  runExpoAndroid();
})();
