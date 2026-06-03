/**
 * Resolve Android SDK path (local.properties → env → default install dir).
 */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

function defaultSdkDir() {
  const home = process.env.USERPROFILE || process.env.HOME || '';
  if (process.platform === 'win32') {
    return path.join(home, 'AppData', 'Local', 'Android', 'Sdk');
  }
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Android', 'sdk');
  }
  return path.join(home, 'Android', 'Sdk');
}

function resolveSdkDir(projectRoot) {
  const localPropsPath = path.join(projectRoot, 'android', 'local.properties');
  let sdkDir = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;

  if (!sdkDir && fs.existsSync(localPropsPath)) {
    const content = fs.readFileSync(localPropsPath, 'utf8');
    const match = content.match(/sdk\.dir=(.+)/);
    if (match) {
      sdkDir = match[1]
        .trim()
        .replace(/\\\\/g, path.sep)
        .replace(/\\/g, path.sep);
    }
  }

  if (!sdkDir || !fs.existsSync(sdkDir)) {
    const fallback = defaultSdkDir();
    if (fs.existsSync(fallback)) sdkDir = fallback;
  }

  return sdkDir;
}

function sdkTools(sdkDir) {
  const exe = process.platform === 'win32' ? '.exe' : '';
  return {
    adb: path.join(sdkDir, 'platform-tools', `adb${exe}`),
    emulator: path.join(sdkDir, 'emulator', `emulator${exe}`),
  };
}

function prependSdkToPath(sdkDir) {
  const pathSep = process.platform === 'win32' ? ';' : ':';
  process.env.ANDROID_HOME = sdkDir;
  process.env.PATH = [
    path.join(sdkDir, 'platform-tools'),
    path.join(sdkDir, 'emulator'),
    process.env.PATH,
  ].join(pathSep);
}

/** Strip CRLF from emulator -list-avds output (Windows bug). */
function normalizeAvdName(name) {
  return String(name).replace(/\r/g, '').trim();
}

function listAvds(emulatorPath) {
  const result = spawnSync(emulatorPath, ['-list-avds'], { encoding: 'utf8' });
  return (result.stdout || '')
    .split(/\r?\n/)
    .map(normalizeAvdName)
    .filter(Boolean);
}

function androidHome() {
  return process.env.USERPROFILE || process.env.HOME || '';
}

function readAvdAbi(avdName) {
  const name = normalizeAvdName(avdName);
  const iniPath = path.join(androidHome(), '.android', 'avd', `${name}.ini`);
  if (!fs.existsSync(iniPath)) return null;

  const ini = fs.readFileSync(iniPath, 'utf8');
  const pathMatch = ini.match(/^path=(.+)$/m);
  if (!pathMatch) return null;

  const avdDir = pathMatch[1].trim();
  const configPath = path.join(avdDir, 'config.ini');
  if (!fs.existsSync(configPath)) return null;

  const config = fs.readFileSync(configPath, 'utf8');
  const abiMatch = config.match(/^abi\.type=(.+)$/m);
  return abiMatch ? abiMatch[1].trim() : null;
}

/**
 * Pick an AVD that runs on this host (x86_64 on Intel/AMD Windows).
 */
function pickAvd(emulatorPath) {
  if (process.env.ANDROID_AVD) {
    return normalizeAvdName(process.env.ANDROID_AVD);
  }

  const avds = listAvds(emulatorPath);
  if (!avds.length) return null;

  const hostIsIntel =
    process.platform === 'win32' || process.platform === 'linux';
  const ranked = avds.map((name) => ({ name, abi: readAvdAbi(name) }));

  if (hostIsIntel) {
    const x86 = ranked.filter((a) => a.abi === 'x86_64');
    const pool = x86.length ? x86 : ranked;
    const pixel = pool.find((a) => a.name.includes('Pixel'));
    if (pixel) return pixel.name;
    const medium = pool.find((a) => a.name.includes('Medium_Phone'));
    if (medium) return medium.name;
    return pool[0].name;
  }

  return ranked[0].name;
}

function readEmulatorFatal(logFile) {
  if (!logFile || !fs.existsSync(logFile)) return null;
  const lines = fs.readFileSync(logFile, 'utf8').split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('FATAL')) return lines[i].trim();
  }
  return null;
}

module.exports = {
  defaultSdkDir,
  resolveSdkDir,
  sdkTools,
  prependSdkToPath,
  normalizeAvdName,
  listAvds,
  readAvdAbi,
  pickAvd,
  readEmulatorFatal,
};
