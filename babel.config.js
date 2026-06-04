module.exports = function (api) {
  api.cache(true);
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
