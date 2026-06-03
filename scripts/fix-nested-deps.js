#!/usr/bin/env node
/**
 * Remove broken nested @expo/vector-icons under expo/ (missing Fonts/).
 * Metro then resolves the hoisted package via metro.config.js.
 */
const fs = require('fs');
const path = require('path');

const nested = path.join(
  __dirname,
  '..',
  'node_modules',
  'expo',
  'node_modules',
  '@expo',
  'vector-icons'
);
const fontsDir = path.join(
  nested,
  'build',
  'vendor',
  'react-native-vector-icons',
  'Fonts'
);

if (fs.existsSync(nested) && !fs.existsSync(fontsDir)) {
  fs.rmSync(nested, { recursive: true, force: true });
  console.log('fix-nested-deps: removed broken nested @expo/vector-icons');
}
