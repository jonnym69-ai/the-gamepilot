/**
 * Lightweight main-process logger for GamePilot.
 *
 * Provides a single consistent API for the Electron main process so log lines
 * share a common prefix and level tag. Output goes to stdout/stderr, which
 * electron-builder and OS capture pipelines already collect.
 *
 * Levels can be tuned at runtime via the GAMEPILOT_LOG_LEVEL environment
 * variable (error|warn|info|debug|silent). The default is "info".
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3, silent: -1 };

const envLevel = (process.env.GAMEPILOT_LOG_LEVEL || 'info').toLowerCase();
const currentLevel = Object.prototype.hasOwnProperty.call(LEVELS, envLevel) ? LEVELS[envLevel] : LEVELS.info;

const PREFIX = '[GamePilot]';

function timestamp() {
  return new Date().toISOString();
}

function format(level, args) {
  const ts = timestamp();
  const tag = `${PREFIX} ${ts} ${level.toUpperCase()}`;
  return [tag, ...args];
}

const log = {
  error(...args) {
    if (currentLevel >= LEVELS.error) console.error(...format('error', args));
  },
  warn(...args) {
    if (currentLevel >= LEVELS.warn) console.warn(...format('warn', args));
  },
  info(...args) {
    if (currentLevel >= LEVELS.info) console.log(...format('info', args));
  },
  debug(...args) {
    if (currentLevel >= LEVELS.debug) console.log(...format('debug', args));
  },
};

module.exports = log;
module.exports.default = log;
