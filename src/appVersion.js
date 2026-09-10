// Single source of truth for the app version string.
// Defined at build time by Vite (vite.config.js define) or Jest (jest.config.js globals).
// Falls back to '0.0.0' if neither is configured (should never happen).
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
