module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!(@?react-native.*|@react-navigation|@reduxjs|immer|react-redux|lucide-react-native)/)',
  ],
  // Listing setupFiles here replaces the preset's own list, so the preset entry
  // has to be repeated first - dropping it breaks every React Native global.
  setupFiles: [
    require.resolve('@react-native/jest-preset/jest/setup.js'),
    // The social SDKs call into native binaries that do not exist under jest.
    // Google ships its own mock; Apple and Facebook are stubbed in jest.setup.js.
    './node_modules/@react-native-google-signin/google-signin/jest/build/jest/setup.js',
    './jest.setup.js',
  ],
};
