module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['<rootDir>/src/**/*.test.js', '<rootDir>/src/**/*.test.jsx'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    // Transform ES modules in node_modules that are used by tests.
    '[/\\\\]node_modules[/\\\\](?!.*node-polyfills).+\\.(js|jsx)$',
  ],
  moduleNameMapper: {
    // Mock CSS imports so Jest doesn't try to parse them.
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    // Mock static asset imports.
    '\\.(jpg|jpeg|png|gif|webp|svg|ico)$': '<rootDir>/src/__mocks__/fileMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  // Define __APP_VERSION__ so appVersion.js doesn't need require().
  globals: {
    __APP_VERSION__: require('./package.json').version,
  },
  collectCoverageFrom: ['src/**/*.{js,jsx}', '!src/**/*.test.{js,jsx}', '!src/**/*.stories.{js,jsx}'],
  watchPlugins: [],
};
