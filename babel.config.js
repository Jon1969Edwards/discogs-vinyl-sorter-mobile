const fs = require('fs');
const path = require('path');

module.exports = function (api) {
  const envPath = path.resolve(__dirname, '.env');
  api.cache.using(() =>
    fs.existsSync(envPath) ? fs.statSync(envPath).mtimeMs : 'no-env'
  );
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:react-native-dotenv', { moduleName: '@env', path: '.env' }],
      // react-native-worklets/plugin is added automatically by babel-preset-expo@54
      // when react-native-worklets is installed (must match Expo Go: 0.5.1).
      'react-native-reanimated/plugin',
    ],
  };
};
