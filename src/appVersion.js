// Single source of truth for the app version string.
// Defined at build time by webpack DefinePlugin (config-overrides.js),
// which reads package.json version. Falls back for Jest, which runs
// through react-scripts test and doesn't apply config-overrides.
// eslint-disable-next-line no-undef
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : require('../package.json').version;
