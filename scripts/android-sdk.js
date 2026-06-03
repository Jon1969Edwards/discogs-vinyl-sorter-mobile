/**
 * Resolve Android SDK path (local.properties → env → default install dir).
 */
const path = require('path');
const fs = require('fs');

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

module.exports = {
  defaultSdkDir,
  resolveSdkDir,
  sdkTools,
  prependSdkToPath,
};
