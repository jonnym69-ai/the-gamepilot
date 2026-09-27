# GamePilot — Agent Guide

GamePilot is a local-first PC gaming library manager and launcher built with
Electron + React. Version 1.9.0.

## Quick verification commands

```bash
npm run format:check          # Prettier formatting check
npx eslint src --max-warnings 0   # ESLint (zero warnings allowed)
npx jest --ci                 # Jest tests (432 tests, 33 suites)
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

- `src/App.js` — main component (608 lines). Wires together hooks and routes.
  Route elements are wrapped with `RouteErrorBoundary` for per-page failure
  isolation; a top-level `ErrorBoundary` remains as a last-resort fallback.
- `src/index.jsx` — Vite entry point. Renders `<App />` in React StrictMode.
- `src/hooks/` — custom hooks extracted from App.js (13 hooks):
  - `useLibraryFilters.js` — mood/time/genre filter state.
  - `useTheme.js` — theme + big-screen-mode state and body-class effects.
  - `useGlobalInput.js` — keyboard shortcuts, easter-egg keys, controller nav.
  - `useLibraryCuration.js` — all 10 game curation callbacks.
  - `useInterfacePreferences.js` — interface preference subscription.
  - `useLibraryLoading.js` — initial library load + saveLibrary callback.
  - `useLibraryScanner.js` — scan process + loading state.
  - `useGamingStory.js` — story card state + show/dismiss.
  - `useSessionLifecycle.js` — session start/end/recovery/heartbeat/shutdown.
  - `useGameLaunching.js` — handleLaunchGame + launch event listener.
  - `useStillPlayingPrompt.js` — 15-min prompt + deadlines + escape key.
  - `useSessionNotifications.js` — roast/rivalry/streak/identity toasts + rec prompt.
  - `useDynamicBackdrop.js` — cover-art + animated backdrop CSS effects.
  - `useSeasonalFeatures.js` — calendar rewards + seasonal play tracking.
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
  - Vendor libraries are split into separate chunks via `manualChunks`:
    `react-dom`, `react`, `router`, `icons` (lucide-react), `canvas`
    (html2canvas), `charts` (recharts/d3). Main index chunk is ~574 KB.
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
3. Stylelint (non-blocking — duplicate-selector issues resolved; a few
   pre-existing non-duplicate errors remain)
4. Jest tests (blocking)
5. Production build (blocking)

## Conventions

- LF line endings enforced via `.gitattributes`.
- Prettier formatting with single quotes, trailing commas, 100 char width.
- Commits follow conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`).
- `.git-blame-ignore-revs` references the mass-formatting commit `a35095f`.
- No secrets in client bundle. API keys go in Netlify functions or Electron main.
- Theme text tokens are `--text-primary` / `--text-color`; Home defines a local
  `--text` alias. `--bg-primary` may contain a gradient, so do not use it as a
  color argument to `color-mix()`. New mixed-color tokens should have basic
  color fallbacks, with `color-mix()` overrides inside `@supports`.
- For renderer visual checks, `npm start -- --host 127.0.0.1` serves port 3000.
  Test themes through the theme UI or by setting `gamepilot-theme` in an isolated
  browser context before reload; dispatching `themeChange` alone does not update
  ThemeContext's CSS variables.

## Known technical debt

- Five pre-existing Stylelint errors remain: shorthand overrides in `Profile.css`
  and `Settings.css`, and three `no-unknown-animations` findings in
  `cinematicExport.css` / `DailyDoodleTitle.css`. `App.css`, `Home.css`, and
  `LibrarianHubCarousel.css` pass targeted Stylelint checks.
- Main index chunk is ~576 KB, still above the 500 KB Vite warning
  threshold. Further reduction would require lazy-loading services, which is
  more invasive.
- Session history uses localStorage; IndexedDB migration was evaluated and
  deferred — the dual-write system (localStorage + SQLite) works and the
  migration risk outweighs the benefit at current scale.
- `react-scripts` and `react-app-rewired` remain in `package.json`
  dependencies for the `eslint-config-react-app` preset; they can be removed
  once ESLint is reconfigured with standalone plugins.

## Free / Pro edition builds

- `EntitlementService` now resolves edition access from Vite's `__APP_EDITION__`, not local license keys or supporter state. Free is the default; only the exact `pro` build mode enables Pro.
- Pro capabilities are `cinematic-export`, `storage-manager` (Library Reclaimer), `recommendation-tuner`, `era-archive` (past eras list on Home, derived from `currentEraHistory`), `year-over-year` (PeriodComparisonService + YearComparisonCard on Stats) and `pro-themes` (`src/themes/proThemes.json`, gated in ThemeContext and Themes.js; fails closed to dark in Free). Current eras, signature titles, earned rewards, personal-data exports and manual save backup/restore remain Free. Existing saved recommendation weights are preserved and honoured in both editions; only the detailed editor is gated. Basic tuning writes `recommendationTuningWeights`, not `customRecommendationWeights`; explicit custom weights take precedence over basic tuning and presets.
- `npm run build:free` writes `dist/renderer/`; `npm run build:pro` writes `dist/renderer-pro/`. Both contain `edition.json` with the edition and version. `npm start` defaults to Free; `npm run start:pro` previews Pro. Stop all preview servers before packaging.
- `npm run build-electron-win-free` and `npm run build-electron-win-pro` use `build-edition.js`. The existing `build-electron-win` command defaults to Free. The helper rebuilds and checks the edition/version before packaging; it always sets `publish: 'never'`.
- Installer outputs are `~/gamepilot-dist/free/` and `~/gamepilot-dist/pro/`, outside the watched repository. Both keep appId `com.gamepilot.app`, productName `GamePilot`, the existing `GamePilot` userData folder, and packaged renderer path `dist/renderer/index.html`. Do not change those identities independently or add edition-dependent storage prefixes. Installers replace each other, not side by side.
- Regression checks: `npx jest src/services/EntitlementService.test.js src/components/ProGate.test.js src/buildEdition.test.js --ci`. These cover both editions, direct feature entries, stored-data preservation and packaging config; they do not replace a real installer upgrade/downgrade smoke test.
- `/editions` is the local comparison page. Sales remain disabled until checkout, pricing, paid update delivery and early-user arrangements are agreed. Never publish Pro artifacts to the public Free release feed as part of routine CI.
- Jest setup supplies Node's TextEncoder/TextDecoder for tests using the real React Router in jsdom.

## Home navigation

- `/` opens the focused Today view (`HomeDailyOverview`): Play Next, Spotlight, compact era/last-session summary, and active-session end controls. Empty libraries show scan-first onboarding.
- `/?view=discover|activity|identity|wishlist` opens explicit, bookmarkable Home sections. `HomeLayoutContent` only mounts the selected section group; explicit views remain accessible in all reward layouts, including Focus Finder and Streamer Overlay. Without a view, its original layout filtering/order is retained for Dashboard.
- `/dashboard` preserves the full guided dashboard, challenges and legacy Today tabs. Home's footer links to it. Preserve the existing session-feedback and onboarding flows when changing Home.
- Regression checks: `npx jest src/Home.test.js src/RewardEffects.test.js --ci`. They cover launch/end-session callbacks, empty states, view navigation/back/remount, Dashboard and layout-preset access.

## Daily Spotlight

- `DailySpotlightService` selects a library game by the preferred calendar timezone and persists the day's identity. `DailySpotlightCard` appears beside Play Next on Home's Today view; the doodle/paradox remain available in Identity and the Dashboard Today tabs. Spotlight is Free and does not launch games.
- Online facts are opt-in via the card (`dailySpotlightOnlineEnabled`). `steam-spotlight` IPC accepts only a validated numeric Steam AppID; it fetches store details and concurrent players independently through `electron/net.js`. No renderer fetch, API key, sales estimates or non-Steam name matching is used.
- `dailySpotlightFactsV1` retains up to 64 cached games. Normal refresh is 24 hours, retry backoff is one hour, and failed sources retain their last successful timestamp. Cached player counts must never be labelled live. Artwork follows the existing library artwork loader, independently of the online-facts switch.
- Steam `appdetails` can return a game's correct data under a different outer response key (observed for Blasphemous, Hades and Dota 2). Resolve only successful game entries whose internal `data.steam_appid` matches the requested ID; never accept the first entry blindly. `steam-store-details` and Spotlight share this main-process lookup, a bounded success cache and in-flight deduplication. GameModal uses the desktop bridge, not a direct renderer fetch, and offers retry on failure.
- Spotlight includes up to four manually selected Steam screenshots under the existing online-facts opt-in. Disabling it hides the remote gallery; saved text facts remain visible. Screenshot URLs are restricted to HTTPS Steam image hosts. Cached metadata does not guarantee image files are available offline. Facts cache schema version 2 refreshes pre-fix entries once without deleting saved facts.
- Regression checks: `npx jest src/services/DailySpotlightService.test.js src/services/SteamSpotlightBridge.test.js src/components/DailySpotlightCard.test.js src/components/GameModal.test.js --ci`. Bridge tests mock Electron networking; live endpoint checks and renderer tests are not substitutes for a packaged-desktop smoke test.
