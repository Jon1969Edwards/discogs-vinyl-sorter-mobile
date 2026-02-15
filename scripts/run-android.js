#!/usr/bin/env node
/**
 * Runs expo run:android with ANDROID_HOME set from local.properties.
 * Fixes "adb not found" and ensures the correct SDK is used.
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

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

const child = spawn('npx', ['expo', 'run:android'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
