# GamePilot — Agent Guide

GamePilot is a local-first PC gaming library manager and launcher built with
Electron + React. Version 1.9.0.

## Quick verification commands

```bash
npm run format:check          # Prettier formatting check
npx eslint src --max-warnings 0   # ESLint (zero warnings allowed)
npx jest --ci                 # Jest tests (345 tests, 24 suites)
npm run build                 # Production renderer build (Vite)
npm run lint:css              # Stylelint (non-blocking, reports duplicate selectors)
npm run typecheck             # TypeScript type check (tsc --noEmit)
```

All of format:check, eslint, test, and build must pass before committing.
The typecheck command is optional for JS-only changes.

## Architecture

### Main process (Electron)

- `electron.js` — thin orchestrator (173 lines). Creates shared instances
  (GameLauncher, SessionDatabase), registers IPC handlers from modules, and
  manages app lifecycle.
- `electron/` — 17 domain modules, each exporting `registerIpcHandlers(ipcMain, deps)`.
  - `net.js` — shared HTTPS request helper using Electron's Chromium network stack.
  - `windowManager.js` — main window + game-bar overlay creation and getters.
  - `trayManager.js` — system tray icon and menu.
  - `processMonitor.js` — active game process monitoring (3s polling).
  - `passiveWatcher.js` — passive session detection (30s polling).
  - `preferences.js` — startup launch preferences (Windows-only).
  - `systemInfo.js` — hardware info collection via `systeminformation`.
  - `howLongToBeat.js` — HLTB search bridge.
  - `pcgamingWiki.js` — PCGW MediaWiki bridge.
  - `steam.js` — Steam API (reviews, achievements, news, wishlist).
  - `saveManager.js` — save location, backup/restore, disk usage.
  - `uninstall.js` — uninstall planning and execution.
  - `emulator.js` — emulator/ROM selection.
  - `sessionStore.js` — session database IPC.
  - `libraryScan.js` — game launch + library scan IPC.
  - `discord.js` — Discord Rich Presence IPC.
  - `misc.js` — external URL + window control IPC.
- `logger.js` — shared main-process logger.
- `discordPresence.js` — Discord Rich Presence integration.
- `launchHandler.js` — GameLauncher class.
- `sessionDatabase.js` — SessionDatabase class.
- `public/preload.js` — context-isolated preload script.

### Renderer (React + Vite)

- `src/App.js` — main component (1173 lines). Wires together hooks and routes.
- `src/index.jsx` — Vite entry point. Renders `<App />` in React StrictMode.
- `src/hooks/` — custom hooks extracted from App.js:
  - `useLibraryFilters.js` — mood/time/genre filter state.
  - `useTheme.js` — theme + big-screen-mode state and body-class effects.
  - `useGlobalInput.js` — keyboard shortcuts, easter-egg keys, controller nav.
  - `useLibraryCuration.js` — all 10 game curation callbacks.
  - `useInterfacePreferences.js` — interface preference subscription.
- `src/services/` — service modules (library scanning, playtime tracking, etc.).
- `src/components/` — React components.

### Security

- Renderer uses `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- Preload script exposes a controlled `electronAPI` via `contextBridge`.
- Steam API key is server-side only (Netlify function), never in client bundle.
- External URLs are protocol-allow-listed (https/http/file only).
- `app://` protocol validates paths stay within application root.

### Build and packaging

- **Vite** is the renderer build system (`vite.config.js`).
  - `@vitejs/plugin-react` handles React JSX/refresh.
  - `vite-plugin-node-polyfills` polyfills Node built-ins (path, os, process,
    stream, crypto, url, util, buffer, http, https) for browser-compatible
    scanner/utility code shared with the Electron main process.
  - A custom `jsx-in-js` pre-plugin transforms JSX in `.js` files (CRA
    convention) before Vite's build-import-analysis runs.
  - `__APP_VERSION__` is defined via Vite `define` from `package.json`.
  - `process.env.PUBLIC_URL` is defined as empty string for CRA compatibility.
  - Build output: `dist/renderer/` (consumed by electron-builder).
- **Jest** is standalone (`jest.config.js` + `babel.config.js`), no longer
  depends on `react-scripts test`.
  - Babel presets: `@babel/preset-env`, `@babel/preset-react`,
    `@babel/preset-typescript`.
  - CSS imports mocked via `identity-obj-proxy`.
  - Static asset imports mocked via `src/__mocks__/fileMock.js`.
  - `__APP_VERSION__` defined in Jest globals from `package.json`.
- **TypeScript** is set up incrementally (`tsconfig.json` with `allowJs: true`).
  New `.ts`/`.tsx` files can be added alongside existing `.js`/`.jsx` files.
  No existing files have been converted.
- `electron-builder` packages the app. The `files` list in `package.json`
  includes `dist/renderer/**/*`, `electron.js`, `logger.js`, `electron/**/*`,
  and `discordPresence.js`.
- Version source of truth: `package.json` → `__APP_VERSION__` (Vite define +
  Jest globals).

### CI

`.github/workflows/ci.yml` runs on push/PR across Ubuntu and Windows:

1. ESLint (blocking)
2. Prettier format check (blocking)
3. Stylelint (non-blocking — 91 pre-existing duplicate-selector issues)
4. Jest tests (blocking)
5. Production build (blocking)

## Conventions

- LF line endings enforced via `.gitattributes`.
- Prettier formatting with single quotes, trailing commas, 100 char width.
- Commits follow conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`).
- `.git-blame-ignore-revs` references the mass-formatting commit `a35095f`.
- No secrets in client bundle. API keys go in Netlify functions or Electron main.

## Known technical debt

- 91 duplicate CSS selectors across 89 CSS files (Stylelint reports, not yet fixed).
- `App.js` still has ~1173 lines; further hook extraction possible (session
  lifecycle, still-playing prompts, library loading).
- Session history uses localStorage; IndexedDB migration was evaluated and
  deferred — the dual-write system (localStorage + SQLite) works and the
  migration risk outweighs the benefit at current scale.
- `react-scripts` and `react-app-rewired` remain in `package.json`
  dependencies for the `eslint-config-react-app` preset; they can be removed
  once ESLint is reconfigured with standalone plugins.
