# GamePilot v1.9.0 — Manual Smoke-Test & Release Checklist

Use this checklist before tagging or shipping v1.9.0. Automated verification (tests, builds, headless startup) is already complete; the items below require a human on real hardware.

## Automated verification (already complete)

- [x] Full test suite: 23 suites, 336 tests passing
- [x] Production React build completes with no compile errors
- [x] Windows NSIS installer built: `GamePilot Setup 1.9.0.exe`
  - SHA-256: `B08ACF842D6623F1D81B63CC5E3328A1BA84D9BE69B3F84D57BE3C4E15A49C78`
- [x] Linux x64 AppImage built: `GamePilot-1.9.0-x86_64.AppImage`
  - SHA-256: `F1F005F8C75E799A6CAE83EA6A25F5C520C6E192B20BC9657D507658F337CE87`
- [x] Windows packaged executable launched and reached a visible `GamePilot` window
- [x] Linux AppImage headless startup reached Electron `ready` and window `ready-to-show`
- [x] AppImage desktop entry, icon, and packaged files inspected

## Windows manual smoke test

Install `GamePilot Setup 1.9.0.exe` on a clean Windows user account and verify:

- [ ] Installer completes without error
- [ ] SmartScreen warning is expected (installer is unsigned) and bypassable
- [ ] App launches from Start Menu shortcut
- [ ] App launches from Desktop shortcut
- [ ] Tray icon appears and shows context menu
- [ ] Window title shows `GamePilot`
- [ ] Library scan discovers Steam games
- [ ] Library scan discovers GOG Galaxy games (if installed)
- [ ] Game cards show portrait artwork in grid view
- [ ] Library list view shows landscape/header artwork as expected
- [ ] Launching a Steam game opens the correct Steam URL
- [ ] Launching a GOG game opens the correct GOG URL
- [ ] Passive session monitoring detects a running game and records playtime
- [ ] Stopping a game ends the session and persists it to history
- [ ] Home page persona reflects recently played games (not stale all-time)
- [ ] Home "Because you played" shelf appears after recent play
- [ ] Home champion spotlight shows current period champion with cover
- [ ] Timeline page shows weekly/monthly/yearly champion cards with covers
- [ ] Past period champion cards are locked and show frozen persona snapshot
- [ ] Year in Review shows Champion Journey and monthly champion covers
- [ ] Recommendations page surfaces backlog games with explanations
- [ ] Profile all-time toggle switches persona to lifetime view
- [ ] Achievements page shows curated attainable achievements with filters
- [ ] Rewards page displays unlocked card styles/themes/personas
- [ ] Settings page opens and saves preferences
- [ ] Donate/Support page is reachable and coherent
- [ ] Big Screen mode toggles correctly
- [ ] Uninstall preserves user data (sessions, champions, library) unless manually removed
- [ ] Uninstall modal behaves correctly

## Linux / Steam Deck manual smoke test

Run `GamePilot-1.9.0-x86_64.AppImage` on a real Linux install (Ubuntu/SteamOS) and verify:

- [ ] AppImage launches with `--no-sandbox` (double-click or terminal)
- [ ] AppImage launches without `--no-sandbox` on a system where FUSE permissions allow it
- [ ] Window title shows `GamePilot`
- [ ] Tray icon appears (where the desktop environment supports it)
- [ ] Steam library discovery finds native Linux Steam install
- [ ] Steam library discovery finds Flatpak Steam install (if present)
- [ ] Steam library discovery finds external/SD-card library folders (if present)
- [ ] Game cards show portrait artwork
- [ ] Launching a Steam game uses the `steam://` protocol
- [ ] Passive process monitoring detects a running Steam/Proton game
- [ ] Stopping a game ends the session and persists it
- [ ] Home persona reflects recent play
- [ ] Home champion spotlight and Timeline page render correctly
- [ ] Year in Review shows champion data
- [ ] Recommendations and Achievements pages work
- [ ] No Windows-only scanners throw errors in the Linux runtime
- [ ] DBus warnings (if any) do not block startup or core functionality

## Cross-platform data integrity

- [ ] Champion records created on Windows display covers on Linux (and vice versa)
- [ ] Session history persists across app restarts on both platforms
- [ ] Period champion locking is deterministic (same sessions → same champions)
- [ ] Artwork rehydration repairs older locked champion records on next launch
- [ ] Year in Review export includes champion period detail without clutter

## Pre-release final checks

- [ ] `package.json` version is `1.9.0`
- [ ] `package-lock.json` is consistent with `package.json`
- [ ] `RELEASE_NOTES.md` reflects all v1.9.0 changes
- [ ] `README.md` reflects Linux beta status and current feature set
- [ ] `.github/workflows/linux-build.yml` runs green in the actual repository
- [ ] No secrets, API keys, or local paths committed
- [ ] Working tree reviewed and intentional
- [ ] Commit(s) created with a clear v1.9.0 message
- [ ] Tag `v1.9.0` created (if tagging)
- [ ] Installers/AppImage uploaded to the release artifact store

## Known issues to communicate in the release

- Linux / Steam Deck support is beta until validated on physical hardware
- Windows installer is unsigned (SmartScreen warning expected)
- Some remote game covers may fall back to landscape artwork or a generated placeholder
- Windows-only launchers and system tools are unavailable in the Linux beta
