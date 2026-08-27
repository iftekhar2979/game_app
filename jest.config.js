module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!(@?react-native.*|@react-navigation|@reduxjs|immer|react-redux|lucide-react-native)/)',
  ],
};
