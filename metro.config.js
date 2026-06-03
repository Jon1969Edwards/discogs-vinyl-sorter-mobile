const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// expo ships a nested @expo/vector-icons copy that sometimes lacks Fonts/; use hoisted package.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@expo/vector-icons': path.resolve(projectRoot, 'node_modules/@expo/vector-icons'),
};

module.exports = config;
