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
  - `emulator.js` — emulator/ROM selection, ROM scanning, emulator
    auto-detection, BIOS checks and emulator save-path resolution.
  - `retroAchievements.js` — RetroAchievements API bridge (user's own web API
    key in `z`/`y` params; no relay or server-side secret).
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
- `react-scripts`/`react-app-rewired` were removed; ESLint now uses standalone
  `eslint-config-react-app` (devDep) with `eslint` pinned at 8.x — the
  `react-app`/`react-app/jest` preset names in `eslintConfig` resolve through
  that package. Do not let `eslint` drift to v9+ (flat-config only) without
  migrating the config.
- Residual `npm audit` findings are all dev/build-time and unfixed upstream:
  `braces` (jest/stylelint/electron-reloader glob matching — DoS needs hostile
  glob input; these tools match fixed patterns), `elliptic` (transitive dep of
  `vite-plugin-node-polyfills` via `node-stdlib-browser`; never imported —
  `'crypto'` was removed from the polyfill `include` list so it is absent from
  the shipped bundle), and `sprintf-js` (`electron-builder` build-time chain).
  Electron is at 44.x; `electron-reloader` stays at 1.x (v2 is ESM-only and
  requires Node 22; `electron.js` `require()`s it under
  `ELECTRON_ENABLE_RELOADER`).

## Single-edition build

- There is one GamePilot build — the Free/Pro split was removed. Every feature ships unlocked: cinematic export, Library Reclaimer (`storage-manager`), recommendation tuner, era archive (`currentEraHistory` on Home), year-over-year (PeriodComparisonService + YearComparisonCard on Stats) and the signature theme collection (`src/themes/proThemes.json`).
- `EntitlementService` is retained as dormant compatibility plumbing: `getEdition()` always returns `'pro'`, `isPro()` is always true, `hasFeature()` grants every catalogued feature, and unknown feature keys still fail closed. `ProGate` renders children unconditionally; `ThemeContext`'s pro-theme checks auto-pass. Stored entitlements, founder records and saved recommendation weights are preserved and never mutated by entitlement reads. Do not reintroduce feature gating without revisiting these call-sites.
- The `/donate` and `/editions` routes, the Donate page and the Settings edition/support sections were removed. Optional support lives on the itch.io page (pay-what-you-want), not in-app. `FounderService`/`EntitlementService` supporter plumbing stays dormant — it costs nothing with no founder data and removing it is risk without benefit.
- `npm run build` writes `dist/renderer/` with an `edition.json` stamp (`edition: 'standard'`, version). `npm run build-electron-win` (or `-mac`/`-linux`) uses `build-edition.js`: it rebuilds the renderer, verifies the stamp version matches `package.json`, and packages with `publish: 'never'`.
- The Performance Cockpit page was removed: its "can run X settings" verdicts were doubly-estimated (hardware score guess × requirements guess) and could be visibly wrong. `HardwareDetector` stays for real hardware reads — StorageManager/Library drive mapping and the `SystemSpecsCard` in Settings → About, which shows detected CPU/GPU/RAM/OS/storage with no verdicts. The orphaned `/startup-questionnaire` route was also removed; onboarding answers are edited inline on Profile via `StartupPersonalizationService`.
- User-facing download names are evergreen: `GamePilot-Setup.exe` and `GamePilot-${arch}.AppImage`. Keep internal version metadata for packaging and diagnostics; no new tag or release is needed for a local build. The single Windows installer is `GamePilot-Setup.exe` in `~/gamepilot-dist/` (outside the watched repo). It keeps appId `com.gamepilot.app`, productName `GamePilot`, the existing `GamePilot` userData folder, and packaged renderer path `dist/renderer/index.html` — installs replace previous editions in place, sharing their local data.
- Regression checks: `npx jest src/services/EntitlementService.test.js src/components/ProGate.test.js src/buildEdition.test.js --ci`. These cover unconditional access, stored-data preservation and packaging config; they do not replace a real installer upgrade smoke test.
- Jest setup supplies Node's TextEncoder/TextDecoder for tests using the real React Router in jsdom.

## Home navigation

- `/` opens the focused Today view (`HomeDailyOverview`): the `DailyDoodleTitle` greeting banner (also still in the Dashboard Today tabs), `TodayStrip` (check-in streak with claim, last-seven-day session summary, current era, live hide-and-seek progress, daily paradox teaser), Play Next, Spotlight, compact era/last-session summary, and active-session end controls. All strip data is local (CalendarXPService, SessionRepository, CurrentEraService, SeasonalHideAndSeekService, DailyParadoxService) — no network calls. Empty libraries show scan-first onboarding.
- `/?view=discover|activity|identity|wishlist` opens explicit, bookmarkable Home sections. `HomeLayoutContent` only mounts the selected section group; explicit views remain accessible in all reward layouts, including Focus Finder and Streamer Overlay. Without a view, its original layout filtering/order is retained for Dashboard.
- `/dashboard` preserves the full guided dashboard, challenges and legacy Today tabs. Home's footer links to it. Preserve the existing session-feedback and onboarding flows when changing Home.
- Regression checks: `npx jest src/Home.test.js src/RewardEffects.test.js --ci`. They cover launch/end-session callbacks, empty states, view navigation/back/remount, Dashboard and layout-preset access.

## Eras and personas from imported playtime

- `CurrentEraService.getCurrentEra()` falls back to an imported-playtime estimate when the last-30-day session window is empty: per-game weight is imported minutes (`importedPlaytimeMinutes`/`playtimeForever`/`totalPlaytime`) recency-decayed by `last_played` (10-day half-life). Estimated eras are flagged `estimated: true`, carry `dayCount: null`, are labelled "estimated" in `CurrentEraCard`/`TodayStrip`/share taglines, and never write to `currentEraHistory` — the era archive stays real-session-only.
- `CurrentEraService.getEraTransition()` derives the most recent "era ended" moment from the last two `currentEraHistory` signatures. `EraTransitionCard` on Today shows it for 14 days after the flip and dismisses per transition signature (`eraTransitionDismissedV1`). `MonthlyRecapStrip` on Today totals the current calendar month from `SessionRepository` only — no network. `CurrentEraCard` (full version, Identity section) has a Share era menu rendering `EraShareCard` (1080×1080) via html2canvas, same contract as `ChampionShareCard`.
- The session feedback modal carries an optional 140-char one-line journal; it persists to the settled history entry via `SessionRepository.updateSessionEntry(sessionId, { note }, { gameName, endTime })` — a merge-patch on the entry, dual-written through `sessionStoreReplaceHistory`. `useSessionLifecycle` includes `sessionId` in the `gamepilot:session-ended` detail so the note targets the right entry. Notes surface in the Activity section's Recent Activity card under "Journal".
- `WhatsNewCard` on Today shows curated `src/whatsNew.js` bullets once per `__APP_VERSION__` (`whatsNewSeenVersion`), hidden for first-run users. Update `WHATS_NEW` alongside RELEASE_NOTES.md each release.
- Wishlist artwork heals via `steam-store-details`: `WishlistSection` fetches canonical `header_image`/`capsule_image` for entries whose `thumb` is missing or a guessed `/apps/<id>/header.jpg` path (which 404s on newer app IDs), backfills via `WishlistService.backfillGame`, and prefers the healed URL in the candidate list. `fetchStoreDetails` validates those URLs through `steamImageUrl`.
- `GamingPersonaService` already cold-starts from `getBlendedPlaytimeMinutes` (which includes `importedPlaytimeMinutes`) until ~10 tracked hours; no extra seeding needed there.
- Steam/GOG only store playtime totals + last-played — no historical timeline exists, so never fabricate backdated eras or sessions.

## Daily Spotlight

- `DailySpotlightService` selects a library game by the preferred calendar timezone and persists the day's identity. `DailySpotlightCard` appears beside Play Next on Home's Today view; the doodle/paradox remain available in the Dashboard Today tabs (the Identity extras section was removed). Today's paradox teaser links to `/dashboard?tab=doodle` — `HomeTodayTabs` honours an `initialTab` prop so the link opens the Doodle & Paradox tab directly. Spotlight cards carry a Poster/Fill/Mosaic artwork-style picker persisted per surface via `spotlightArtStyles`. Spotlight does not launch games.
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

## Library ranking and top shelf

- `getLibraryRank` / `isTopShelfRank` / `getTopPlayedGames` in `src/services/gameClassification.js` are the single source for the user's own most-played ranking. Competition ranking over blended playtime; ties share a rank; non-game launcher tokens and unplayed games are excluded; libraries under two real games return nothing.
- `LibraryLeaderboard` tops the Home Activity section with a persisted Top 10/Top 20 board (`libraryLeaderboardLimitV1`); the cutoff keeps every game tied at the boundary rank. Spotlight, Rediscover and GameModal show the same rank/`Top shelf` pill. Never present the "Your hours" mode as a regional or global ranking — it is local to the user's library.
- The board's `Playing now` mode (`libraryLeaderboardModeV1`) crosses Steam's live most-played chart with the user's library. `steam-most-played` IPC wraps the keyless `ISteamChartsService/GetGamesByConcurrentPlayers` endpoint (top 100 by concurrent players, 10-minute cache, validated rows). When fewer than 8 owned games chart, per-game `steam-player-count` fills up to 10 more rows from the user's most-played Steam games — those rows show a live count but no chart rank. Player counts are displayed "playing now" with a fetched timestamp; never cache them longer than the main-process TTL or label them anything other than live.
- `BacklogBusterList` (Discover, inside Backlog Plan) is the user-curated counterpart to the automatic backlog queue: under-1h/under-2h threshold picks persisted in `backlogBusterListV1`, keys via `getCanonicalGameKey`. Entries are `{ key, threshold }` records (legacy plain strings migrate to a 60m threshold); a pick is "busted" once its blended playtime crosses its picked threshold, and the header shows "N of M busted" with a progress bar and a completion line when all are cleared.
- `TrendingNowCard` on Discover shows owned Steam games currently on Steam's live most-played chart, reusing the shared cached `steam-most-played` IPC — no second pipeline. Steam-only; hides without the bridge or zero matches.
- `FinishableThisWeekend` (Discover, inside Backlog Plan under the buster list) shows backlog games whose cached HLTB main-story minus played fits ~8h. It kicks a throttled `HowLongToBeatService.warmup` for up to 20 uncached backlog titles per mount and re-reads the cache when fetches land.
- Regression checks: `npx jest src/services/gameClassification.test.js src/components/LibraryLeaderboard.test.js src/components/BacklogBusterList.test.js --ci`.

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
- The Steam Web API key stays server-side: renderer → `steam-friends` IPC → `electron/steam.js` → `https://gamepilot-moz.netlify.app/api/getSteamFriends` → `netlify/functions/getSteamFriends.js` → `api.steampowered.com` (`STEAM_API_KEY` env var). No renderer fetch, no key in the client bundle.
- The function validates a 17-digit Steam64 ID, caps at 200 friends, batches `GetPlayerSummaries` at 100 IDs, and returns trimmed fields (name, avatar, `personastate`, current game, appid). 401/403 from `GetFriendList` maps to a "friends list is private" message — missing presence must never be presented as "offline".
- Presence is read-only public Steam data, cached 60s in the main process and service layer. Friends are grouped by the game they're playing — multiple friends in one game get a "squad" row with stacked avatars and a `Join them` action when you own it; a single friend's current game offers "Play your copy" only when its appid matches a Steam game in the local library via `getSteamAppId`.
- Regression checks: `npx jest src/services/SteamFriendsService.test.js src/components/FriendsPlayingCard.test.js --ci`. Live presence needs the Netlify function deployed with `STEAM_API_KEY` set — Jest mocks the bridge and cannot verify the relay end-to-end.

## Owned, not installed

- `NotInstalledSection` at the bottom of the Library page lists owned-but-uninstalled games from two sources: Steam (opt-in "Steam Owned Games" toggle, `steamOwnedGamesEnabled`, same Steam64 ID) and GOG (local Galaxy DB, no toggle or network).
- Steam path: `steam-owned-library` IPC → `electron/steam.js` → `api/getSteamLibrary` → `netlify/functions/getSteamLibrary.js` → `IPlayerService/GetOwnedGames` (`include_appinfo=1&include_played_free_games=1`). Trimmed fields only (appid/name/playtime/icon), 6h cache both layers. Private game details return an empty array plus `privateDetails` — mapped to honest messaging, never presented as an empty library. Free games only appear when they have recorded playtime (Steam API limitation, disclosed in the UI).
- `SteamOwnedGamesService.diffUninstalled` subtracts installed games by Steam appid via `getSteamAppId`. Steam rows offer an Install button → `steam-install` IPC → `shell.openExternal('steam://install/<appid>')` with validated numeric appid (same validation as `open-steam-library`).
- GOG path: `gog-uninstalled` IPC → `nativeLibraryScanner` → `getGogGalaxyUninstalledGames` in `scannerUtils` — reads `galaxy-2.0.db` via sql.js. **Ownership comes from `LibraryReleases`** (restricted to the dominant `userId`), NOT `GamePieces` — `GamePieces` caches store metadata for thousands of unowned products. Titles are JSON blobs (`{"title":"..."}`) parsed via `parseGogPieceTitle`; `{"title":null}` rows drop out. `GAMETIMES`/`LASTPLAYEDDATES` supply playtime, then `diffUninstalledByTitle` subtracts installed games by normalized title. Runs in the main process (real fs), not the renderer. GOG rows get an "Install via Galaxy" button (`gog-open-galaxy` IPC → `goggalaxy://openGameView/<productId>`, opens the Galaxy game page — no direct install URI exists). The existing `getGogGalaxyPlaytime` reader also parses titles via `parseGogPieceTitle`.
- Regression checks: `npx jest src/services/SteamOwnedGamesService.test.js src/components/NotInstalledSection.test.js src/services/scanner/scanner.test.js --ci`. The relay needs `STEAM_API_KEY` deployed; GOG coverage needs a real Galaxy install — Jest cannot verify either end-to-end.

## Steam profile card

- `SteamProfileCard` on Profile is opt-in via Settings ("Steam Profile Card", off by default) and reuses the `steamWishlistId` Steam64 ID. It hides entirely when disabled, unconfigured, or still loading.
- Same relay pattern: `steam-profile` IPC → `electron/steam.js` (5 min cache) → `api/getSteamProfile` → `netlify/functions/getSteamProfile.js` → `GetPlayerSummaries` + `GetBadges`. GetBadges supplies level/xp/badge-count in one call; private game details return null stats, not an error — the card renders name/avatar with a "limited profile" tag.
- The function only returns trimmed fields and validates avatar/profile URLs against `steamstatic.com`/`steamcommunity.com` hosts. Renderer caches 6 h and discards profiles older than 24 h.
- Regression checks: `npx jest src/services/SteamProfileService.test.js src/services/SteamProfileBridge.test.js src/components/SteamProfileCard.test.js --ci`. Bridge tests must use distinct Steam64 IDs per network case — the handler's in-memory cache persists across tests in the same module instance.

## IGDB artwork enrichment

- `IgdbArtworkService` fills `coverImage` on games that resolve to no artwork (non-Steam titles), using official IGDB covers. Opt-in via Settings ("IGDB Cover Art Lookup", off by default); it runs on library load and after scans, never blocks the scan result, and never overwrites `coverArtOverride`.
- Credentials stay server-side: renderer → `igdb-lookup` IPC → `electron/igdb.js` → `https://gamepilot-moz.netlify.app/api/getIgdbGame` → `netlify/functions/getIgdbGame.js` → `api.igdb.com` (Twitch `TWITCH_CLIENT_ID`/`TWITCH_CLIENT_SECRET` env vars; the function fetches and caches an OAuth token itself).
- Only the game name is sent. Lookups are cached on-device (`igdbArtworkCacheV1`): hits for 30 days, misses for 7 days; calls are throttled to ~2.5/s. The `enrichLibraryCovers` result is a new array (or null) — persist via `saveLibrary`/`StorageService`.
- Regression checks: `npx jest src/services/IgdbArtworkService.test.js --ci`. Env-var changes require a `netlify deploy --prod` before functions see them.

## Steam wishlist import

- `steam-wishlist` IPC uses Steam's anonymous `IWishlistService/GetWishlist/v1` endpoint directly through `electron/net.js`, not Netlify. The obsolete `/wishlistdata/` endpoint redirects to the store homepage; its sign-in text is not evidence of a private wishlist. The legacy HTML scraper is only a 404 fallback, not the primary path (the older comment in `electron/steam.js` describes the former implementation).
- The service returns AppIDs only. Fetch `appdetails` per AppID (multi-ID full-detail calls can return null), match internal `steam_appid`, and allow DLC. Enrichment has three concurrent requests, a 1.5-second pause between uncached batches, a bounded 24-hour in-memory cache, and stops subsequent batches on rate limiting. Missing names must never become fake game titles or silent successful empty imports.
- Check Steam's `x-eresult` header: access denied can arrive as HTTP 200 with an empty response. Distinguish confirmed empty, denied access, rate limiting and malformed/unavailable data. Partial imports preserve local entries and report skipped details in Settings; they do not set the successful 24-hour sync timestamp.
- Wishlist artwork lives in `thumb`; `addGame` accepts `image` as an alias. Never guess `cdn.cloudflare.steamstatic.com/steam/apps/<id>/header.jpg` — that path 404s on newer app IDs whose headers sit under hashed `store_item_assets` URLs. `SimilarGamesService` prefers stored `thumb`/`image`; `SteamWishlistService.sync` backfills `thumb`/`steamAppID`/`genres` on existing entries via `WishlistService.backfillGame` (fill-only, never overwrites).
- Regression checks: `npx jest src/services/SteamWishlistBridge.test.js src/services/WishlistService.test.js src/services/SimilarGamesService.test.js --ci`. Live HTTP checks verified the old redirect, the new public wishlist response and access-denied headers; installed apps require a rebuilt installer and a real Sync Now smoke test.

## Wishlist deals and alerts

- Wishlist pricing uses CheapShark (`/games?title=` then `/games?id=` for deals + `cheapestPriceEver`), fetched directly from the renderer — CheapShark allows CORS, no key, no relay. Prices cache 24h in `wishlistPriceCacheV1`; `refreshIfStale` is the only scheduled entry point (kicked from `HomeDailyOverview` mount and the wishlist page).
- Cards render the full price picture: current price (or Free), retail strikethrough, discount %, store name, Price drop / Historic low badges, and a View deal link via `cheapshark.com/redirect?dealID=`. The per-item threshold is the user's alert price.
- `wishlistAlertSummaryV1` is the local deal count; every write dispatches `gamepilot:wishlist-alerts`, which TodayStrip listens to for its "N deals" chip. Never fetch prices synchronously in the strip — read the summary only.
- Regression checks: `npx jest src/services/WishlistService.test.js src/components/TodayStrip.test.js --ci`.

## Steam library navigation

- GameModal's secondary Open in Steam action uses the validated Steam ID and dedicated `open-steam-library` IPC. The main process constructs only `steam://nav/games/details/<appid>` from a positive uint32 string. It does not use launch-game, session tracking or XP callbacks; the general external URL allow-list is unchanged.
- Regression checks: `npx jest src/components/GameModal.test.js src/services/SteamLibraryBridge.test.js --ci`. Verify actual navigation with an installed Steam client after rebuilding the desktop app.

## Session history sharing

- RecentActivity opens SessionHistoryShare with an immutable selected-period snapshot. The native modal previews the same 1200×900 canvas used for PNG download and clipboard copy through LocalShareService. Names are opt-in, no profile/social fields are read, and no upload is performed.
- RecentActivityAggregator totals and daily bars use the same inclusive calendar-day window (today plus the preceding days minus one), excluding future calendar dates. Session duration is attributed to its end date, not split across midnight.
- Regression checks: `npx jest src/components/SessionHistoryShare.test.js src/services/RecentActivityAggregator.test.js --ci`. Clipboard and download still require a packaged-desktop smoke check.

## Recommendations and Home rewards

- Recommendations opens directly into Perfect Play (up to three picks). Genre filters, tuning and alternative modes are secondary disclosures. `/swipe-deck` redirects to `/recommendations`; the component and stylesheet were deleted, while `swipeDeckShortlist` / `swipeDeckHistory` saved data remains untouched. Do not restore casual swipe-to-14-day-suppression behaviour.
- Recommendations uses `getBlendedPlaytimeMinutes` and `isGameUnplayed` for imported playtime and played-elsewhere consistency. Session Playlist's short-game suggestions use cached `HowLongToBeatService.getEstimate().mainStory` in hours (0 < hours <= 2), not hours already played; unknown completion lengths are not presented as short games.
- `getTodayLayoutStyle` in `HomeLayoutContent.js` provides shared CSS variables for the real Today layout and Rewards previews. All five Home tabs stay available under every layout. Today cards (`home-daily-play`, `daily-spotlight`) consume equipped card styles; the friends card lives inside the story panel rather than an unassigned grid cell.
- Reward catalog totals include card styles, logo animations and showcase slots. Signature titles remain in the catalog but are excluded from the XP-only roadmap because they require gameplay, not XP.
- Regression checks: `npx jest src/RewardEffects.test.js src/Home.test.js src/services/RecommendationEngine.test.js --ci`. Also check actual computed styles in a browser after transitions settle; jsdom verifies the wiring but not the CSS cascade. Use an isolated context and StorageService-prefixed fixture keys (`gamepilot-library`), never the user's desktop data.

## Local backup and clear

- `DataManager.exportUserData` (v3) exports every `gamepilot-`-prefixed
  localStorage key verbatim, minus `EXPORT_EXCLUDED_KEYS` (regenerable caches
  and `activeGameSessions`). When adding a new storage key, user data needs no
  backup wiring; only add genuine caches to the exclusion set. Stale
  "currently playing" state must never be restored.
- `importUserData` and `clearAllUserData` are async. Import restores raw
  strings via `setString` and parsed values via `set`, routes `sessionHistory`
  through `SessionRepository.replaceHistory` (SQLite + fallback mirror), and
  clears active sessions. Clear uses `StorageService.clear()` plus
  `session-store-clear` — do not go back to curated key lists, they silently
  miss new features.
- Regression checks: `npx jest src/DataManager.test.js --ci`.

## Progress area

- `/progress` redirects to `/habits`. `ProgressTabs` (Goals & Habits /
  Achievements / Rewards) renders at the top of all three pages so they read
  as one area; the More menu links once to `/progress`. Keep the individual
  `/habits`, `/achievements` and `/rewards` routes working — they are the tab
  targets, not dead pages.
- Habits owns goals, streaks, seasonal quests and the mood log; Stats owns
  analytics and period insights. Don't re-duplicate per-period stat blocks
  across both.
- Regression checks: `npx jest src/components/HybridNavBar.test.js src/RewardEffects.test.js --ci`.

## Emulator library

- `EmulatorLibraryService` scans profile ROM folders into `source: 'emulator'`
  games. Scans dedupe by title: region tags (`(USA)`/`(Europe)`/...) collapse
  to the preferred entry (USA > World > Europe > Japan), `.cue`/`.gdi`/`.m3u`
  launcher files beat `.bin`/payload files sharing a stem, and disc/side tags
  keep multi-disc sets as separate entries. Untagged dumps lose to tagged ones.
- `coverImage` on emulated games points at keyless `thumbnails.libretro.com`
  `Named_Boxarts` URLs built from the raw DAT-style stem (region tags kept,
  `&*/:<>?\|"` sanitized to `_`). 404s degrade to placeholders via LazyImage's
  failed-image cache — never probe URLs just to check they exist.
- `detect-emulators` / `emulator-bios-check` / `emulator-save-paths` IPCs in
  `electron/emulator.js` drive the Settings manager: detected installs prefill
  the profile draft, and BIOS results are advisory warnings on profile chips
  (PS1/PS2/Saturn/Dreamcast/3DS required, DS/GBA optional) — never a hard
  launch block. Emulator saves route through the same `SaveBackupPanel`/
  `SaveManager` pipeline; `SaveBackupService.buildPlan` short-circuits to
  `buildEmulatorPlan` for `source: 'emulator'` games instead of PCGamingWiki.
- RetroAchievements is opt-in (`retroAchievementsEnabled` + username + the
  user's own web API key in Settings). `electron/retroAchievements.js` calls
  RA directly — no relay. `enrichEmulatedGames` matches scanned games to the
  RA catalog (one game-list call per console) and fetches progress for a
  capped slice; matched games get `raGameId`/`raProgress` rendered as an
  `RA x/y` tag on library cards. Consoles RA doesn't cover (GC/Wii/3DS/
  Switch/PS3) get no match, not an error.
- Regression checks: `npx jest src/services/EmulatorLibraryService.test.js src/services/RetroAchievementsService.test.js src/services/SaveBackupService.test.js --ci`. Detection/BIOS/save IPCs are main-process fs code — verify them in a packaged-desktop smoke test, not jsdom.
