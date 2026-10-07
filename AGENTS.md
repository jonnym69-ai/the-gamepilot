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

## Single-edition build

- There is one GamePilot build — the Free/Pro split was removed. Every feature ships unlocked: cinematic export, Library Reclaimer (`storage-manager`), recommendation tuner, era archive (`currentEraHistory` on Home), year-over-year (PeriodComparisonService + YearComparisonCard on Stats) and the signature theme collection (`src/themes/proThemes.json`).
- `EntitlementService` is retained as dormant compatibility plumbing: `getEdition()` always returns `'pro'`, `isPro()` is always true, `hasFeature()` grants every catalogued feature, and unknown feature keys still fail closed. `ProGate` renders children unconditionally; `ThemeContext`'s pro-theme checks auto-pass. Stored entitlements, founder records and saved recommendation weights are preserved and never mutated by entitlement reads. Do not reintroduce feature gating without revisiting these call-sites.
- The `/donate` and `/editions` routes, the Donate page and the Settings edition/support sections were removed. Optional support lives on the itch.io page (pay-what-you-want), not in-app. `FounderService`/`EntitlementService` supporter plumbing stays dormant — it costs nothing with no founder data and removing it is risk without benefit.
- `npm run build` writes `dist/renderer/` with an `edition.json` stamp (`edition: 'standard'`, version). `npm run build-electron-win` (or `-mac`/`-linux`) uses `build-edition.js`: it rebuilds the renderer, verifies the stamp version matches `package.json`, and packages with `publish: 'never'`.
- The Performance Cockpit page was removed: its "can run X settings" verdicts were doubly-estimated (hardware score guess × requirements guess) and could be visibly wrong. `HardwareDetector` stays for real hardware reads — StorageManager/Library drive mapping and the `SystemSpecsCard` in Settings → About, which shows detected CPU/GPU/RAM/OS/storage with no verdicts. The orphaned `/startup-questionnaire` route was also removed; onboarding answers are edited inline on Profile via `StartupPersonalizationService`.
- The single installer is `GamePilot-Setup-${version}.exe` in `~/gamepilot-dist/` (outside the watched repo). It keeps appId `com.gamepilot.app`, productName `GamePilot`, the existing `GamePilot` userData folder, and packaged renderer path `dist/renderer/index.html` — installs replace previous editions in place, sharing their local data.
- Regression checks: `npx jest src/services/EntitlementService.test.js src/components/ProGate.test.js src/buildEdition.test.js --ci`. These cover unconditional access, stored-data preservation and packaging config; they do not replace a real installer upgrade smoke test.
- Jest setup supplies Node's TextEncoder/TextDecoder for tests using the real React Router in jsdom.

## Home navigation

- `/` opens the focused Today view (`HomeDailyOverview`): the `DailyDoodleTitle` greeting banner (also still in Identity and the Dashboard Today tabs), `TodayStrip` (check-in streak with claim, last-seven-day session summary, current era, live hide-and-seek progress, daily paradox teaser), Play Next, Spotlight, compact era/last-session summary, and active-session end controls. All strip data is local (CalendarXPService, SessionRepository, CurrentEraService, SeasonalHideAndSeekService, DailyParadoxService) — no network calls. Empty libraries show scan-first onboarding.
- `/?view=discover|activity|identity|wishlist` opens explicit, bookmarkable Home sections. `HomeLayoutContent` only mounts the selected section group; explicit views remain accessible in all reward layouts, including Focus Finder and Streamer Overlay. Without a view, its original layout filtering/order is retained for Dashboard.
- `/dashboard` preserves the full guided dashboard, challenges and legacy Today tabs. Home's footer links to it. Preserve the existing session-feedback and onboarding flows when changing Home.
- Regression checks: `npx jest src/Home.test.js src/RewardEffects.test.js --ci`. They cover launch/end-session callbacks, empty states, view navigation/back/remount, Dashboard and layout-preset access.

## Eras and personas from imported playtime

- `CurrentEraService.getCurrentEra()` falls back to an imported-playtime estimate when the last-30-day session window is empty: per-game weight is imported minutes (`importedPlaytimeMinutes`/`playtimeForever`/`totalPlaytime`) recency-decayed by `last_played` (10-day half-life). Estimated eras are flagged `estimated: true`, carry `dayCount: null`, are labelled "estimated" in `CurrentEraCard`/`TodayStrip`/share taglines, and never write to `currentEraHistory` — the era archive stays real-session-only.
- `GamingPersonaService` already cold-starts from `getBlendedPlaytimeMinutes` (which includes `importedPlaytimeMinutes`) until ~10 tracked hours; no extra seeding needed there.
- Steam/GOG only store playtime totals + last-played — no historical timeline exists, so never fabricate backdated eras or sessions.

## Daily Spotlight

- `DailySpotlightService` selects a library game by the preferred calendar timezone and persists the day's identity. `DailySpotlightCard` appears beside Play Next on Home's Today view; the doodle/paradox remain available in Identity and the Dashboard Today tabs. Spotlight does not launch games.
- Online facts are opt-in via the card (`dailySpotlightOnlineEnabled`). `steam-spotlight` IPC accepts only a validated numeric Steam AppID; it fetches store details and concurrent players independently through `electron/net.js`. No renderer fetch, API key, sales estimates or non-Steam name matching is used.
- `dailySpotlightFactsV1` retains up to 64 cached games. Normal refresh is 24 hours, retry backoff is one hour, and failed sources retain their last successful timestamp. Cached player counts must never be labelled live. Artwork follows the existing library artwork loader, independently of the online-facts switch.
- Steam `appdetails` can return a game's correct data under a different outer response key (observed for Blasphemous, Hades and Dota 2). Resolve only successful game entries whose internal `data.steam_appid` matches the requested ID; never accept the first entry blindly. `steam-store-details` and Spotlight share this main-process lookup, a bounded success cache and in-flight deduplication. GameModal uses the desktop bridge, not a direct renderer fetch, and offers retry on failure.
- Spotlight includes up to four manually selected Steam screenshots under the existing online-facts opt-in. Disabling it hides the remote gallery; saved text facts remain visible. Screenshot URLs are restricted to HTTPS Steam image hosts. Cached metadata does not guarantee image files are available offline. Facts cache schema version 2 refreshes pre-fix entries once without deleting saved facts.
- Regression checks: `npx jest src/services/DailySpotlightService.test.js src/services/SteamSpotlightBridge.test.js src/components/DailySpotlightCard.test.js src/components/GameModal.test.js --ci`. Bridge tests mock Electron networking; live endpoint checks and renderer tests are not substitutes for a packaged-desktop smoke test.

## Discover choices and free-to-play catalogue

- Quick-pick skips are component-local for the current Discover visit, survive mood/time changes, and never write negative taste feedback. Replacement preserves the other cards; reset and remount clear skips. Running games are excluded before scoring.
- External discovery mounts only its selected category: limited-time giveaways or curated free-to-play essentials. The existing `discoverEpicRadarVisible` preference hides both. GamerPower uses on-open/manual refresh with an hourly cache, not an hourly timer.
- The GamerPower panel shows a "N new since your last visit" badge diffed against `giveawaySeenIdsV1` (capped id set in localStorage). The first-ever visit records a baseline silently so the badge only reports genuinely new listings.
- `SeasonalShelf` renders calendar-driven own-library picks on Discover (e.g. the active seasonal challenge's genres in October, with seasonal fallbacks when the challenge has no genre requirement). Unplayed games rank first; uninstalled games are excluded; the shelf hides when nothing matches.
- `src/constants/FreeToPlayEssentials.json` is a bundled, manually maintained selection (a small set per platform), not a live ranking. Review official links, publisher artwork and purchase caveats when updating it. Do not mix trials, subscriptions or temporary giveaways into the catalogue. Artwork is remote with local placeholders; catalogue browsing itself needs no API or account connection. Landscape publisher art is letterboxed over a blurred copy of itself inside the portrait frame.
- Essentials launches pass the original library object to the existing callback only after an exact platform/ID or explicit-name match with installation evidence. Do not infer one installed game from another sharing its launcher (e.g. League of Legends versus Teamfight Tactics).
- Regression checks: `npx jest src/components/DiscoverQuickPicks.test.js src/components/DiscoverHighlights.test.js src/components/FreeToPlayEssentials.test.js src/Home.test.js --ci`.

## Sharing and export verification

- Share images use html2canvas. Avoid gradient-clipped/transparent text in card CSS: it renders as solid rectangles in PNGs. Verify exported pixels, not only the live DOM. Identity, Story and Year in Review use solid export-safe title colours.
- Weekly/monthly library cards and captions must never substitute lifetime totals when the selected period has no sessions. Export Hub date filters select games by last-played date; its filtered image shows lifetime totals for those games, not period activity. Empty libraries must not export sample games as user data.
- Sharing-app intents do not upload images. Save/copy image is the portable path; clipboard support and external-open failures must be checked. Discord webhooks post directly and require explicit disclosure in the caption dialog; mention parsing is disabled. Backups are private recovery files, not social share files.
- Cinematic posters load cover art before compositing text, render previews offscreen, and export the completed preview. Showcase Export is library-only; its other page choices are disabled with directions to dedicated share cards.
- Regression checks: `npx jest src/services/LocalShareService.test.js src/components/ShareMenu.test.js src/components/ShareCaptionDialog.test.js src/components/ExportModal.test.js src/components/ProGate.test.js --ci`. Browser PNG checks do not verify authenticated social posting or packaged Electron clipboard behaviour.

## On this day in gaming

- `src/constants/GamingHistory.json` is a bundled, manually maintained calendar of real gaming events keyed `MM-DD`; each entry carries `year` and `event`. It is not a live feed — verify dates against reliable sources when adding entries.
- `OnThisDayService` returns the exact day's events, otherwise the nearest covered day within ±3 (earlier dates preferred on ties), capped at three events. `OnThisDayCard` sits at the bottom of Today's "Your story" column, labelled "On this day in gaming" or "This week in gaming", and hides when nothing is nearby. Fully local — no network calls.
- Regression checks: `npx jest src/services/OnThisDayService.test.js src/components/OnThisDayCard.test.js src/Home.test.js --ci`.

## Steam friends presence

- `FriendsPlayingCard` on Today is opt-in via Settings ("Steam Friends Presence", off by default) and reuses the `steamWishlistId` Steam64 ID. It hides entirely when disabled or unconfigured.
- The Steam Web API key stays server-side: renderer → `steam-friends` IPC → `electron/steam.js` → `https://gamepilot.netlify.app/api/getSteamFriends` → `netlify/functions/getSteamFriends.js` → `api.steampowered.com` (`STEAM_API_KEY` env var). No renderer fetch, no key in the client bundle.
- The function validates a 17-digit Steam64 ID, caps at 200 friends, batches `GetPlayerSummaries` at 100 IDs, and returns trimmed fields (name, avatar, `personastate`, current game, appid). 401/403 from `GetFriendList` maps to a "friends list is private" message — missing presence must never be presented as "offline".
- Presence is read-only public Steam data, cached 60s in the main process and service layer. A friend's current game offers "Play your copy" only when its appid matches a Steam game in the local library via `getSteamAppId`.
- Regression checks: `npx jest src/services/SteamFriendsService.test.js src/components/FriendsPlayingCard.test.js --ci`. Live presence needs the Netlify function deployed with `STEAM_API_KEY` set — Jest mocks the bridge and cannot verify the relay end-to-end.

## IGDB artwork enrichment

- `IgdbArtworkService` fills `coverImage` on games that resolve to no artwork (non-Steam titles), using official IGDB covers. Opt-in via Settings ("IGDB Cover Art Lookup", off by default); it runs on library load and after scans, never blocks the scan result, and never overwrites `coverArtOverride`.
- Credentials stay server-side: renderer → `igdb-lookup` IPC → `electron/igdb.js` → `https://gamepilot.netlify.app/api/getIgdbGame` → `netlify/functions/getIgdbGame.js` → `api.igdb.com` (Twitch `TWITCH_CLIENT_ID`/`TWITCH_CLIENT_SECRET` env vars; the function fetches and caches an OAuth token itself).
- Only the game name is sent. Lookups are cached on-device (`igdbArtworkCacheV1`): hits for 30 days, misses for 7 days; calls are throttled to ~2.5/s. The `enrichLibraryCovers` result is a new array (or null) — persist via `saveLibrary`/`StorageService`.
- Regression checks: `npx jest src/services/IgdbArtworkService.test.js --ci`. Env-var changes require a `netlify deploy --prod` before functions see them.

## Wishlist deals and alerts

- Wishlist pricing uses CheapShark (`/games?title=` then `/games?id=` for deals + `cheapestPriceEver`), fetched directly from the renderer — CheapShark allows CORS, no key, no relay. Prices cache 24h in `wishlistPriceCacheV1`; `refreshIfStale` is the only scheduled entry point (kicked from `HomeDailyOverview` mount and the wishlist page).
- Cards render the full price picture: current price (or Free), retail strikethrough, discount %, store name, Price drop / Historic low badges, and a View deal link via `cheapshark.com/redirect?dealID=`. The per-item threshold is the user's alert price.
- `wishlistAlertSummaryV1` is the local deal count; every write dispatches `gamepilot:wishlist-alerts`, which TodayStrip listens to for its "N deals" chip. Never fetch prices synchronously in the strip — read the summary only.
- Regression checks: `npx jest src/services/WishlistService.test.js src/components/TodayStrip.test.js --ci`.
