# GamePilot Release Candidate QA Checklist

Use this checklist before tagging a release candidate or sharing a Windows installer.

## Build and install

- [ ] Run `npm run build` successfully.
- [ ] Run `npm run build-electron-win` successfully.
- [ ] Confirm Electron Builder has no missing metadata warnings.
- [ ] Install from `dist/GamePilot Setup 1.3.0.exe`.
- [ ] Launch installed app from Start Menu/Desktop.
- [ ] Close and reopen the app without errors.
- [ ] Uninstall/reinstall without deleting user data unexpectedly.

## First-run and empty-library flow

- [ ] Fresh profile opens without crashing.
- [ ] Home shows helpful empty states.
- [ ] Library shows empty state and scan CTA.
- [ ] Dashboard route opens with safe empty states.
- [ ] Settings opens and toggles render.
- [ ] No console errors during first-run navigation.

## Library scan

- [ ] Scan local libraries from Home/Library.
- [ ] Steam games appear if installed.
- [ ] Epic games appear if installed.
- [ ] GOG/Xbox/EA/Ubisoft/Battle.net/Rockstar/CurseForge/manual entries do not crash if unavailable.
- [ ] Scan failure returns a readable message instead of crashing.
- [ ] Re-scan preserves existing ratings, replay intent, favorites, notes, and playtime.
- [ ] Last scan report is visible and understandable.

## Launch and session tracking

- [ ] Launch a Steam game successfully.
- [ ] Failed launch shows a readable error and does not create a stuck active session.
- [ ] Launch count increments once per successful launch.
- [ ] Active session appears after launch.
- [ ] End session manually and confirm active session clears.
- [ ] Let process monitor end a session automatically if possible.
- [ ] Session history receives one completed entry.
- [ ] Library playtime increments once.
- [ ] Stats update after session end.
- [ ] Achievements/progression do not repeatedly fire for the same event.
- [ ] Relaunch app after a crash/restart scenario and confirm stale sessions older than 18 hours are pruned.

## Ratings and recommendations

- [ ] Open Game Modal and set a rating.
- [ ] Save rating and confirm modal shows the saved rating.
- [ ] Sort Library by Your Rating and confirm order is correct.
- [ ] Home `Your Library Today` Keep Close card shows the actual rating, not `0/10`.
- [ ] Home hides the rating badge if no valid rating exists.
- [ ] Perfect Play, Surprise Me, Rediscover, and Continue Playing return sensible local results.
- [ ] Dashboard moved modules still render and launch games.

## Backup and restore

- [ ] Save Backup panel appears for games with known save/config locations.
- [ ] Open save location works when the folder exists.
- [ ] Choose backup folder works.
- [ ] Create local backup writes files and manifest.
- [ ] Recent backup history shows the new backup.
- [ ] Check live targets runs preflight.
- [ ] Restore stays blocked while game has an active session.
- [ ] Restore requires typed game-name confirmation.
- [ ] Restore requires a backup destination for the fresh safety backup.
- [ ] Restore creates a fresh safety backup before copying backup files back.
- [ ] Restore writes a restore receipt.
- [ ] Restore does not delete unknown live files.
- [ ] Corrupt/missing manifests fail safely.

## Controller and big-screen mode

- [ ] Enable Big Screen/Controller Mode in Settings.
- [ ] D-pad/left stick moves focus across Home.
- [ ] A/select activates focused buttons/cards.
- [ ] B/back closes modals or navigates back.
- [ ] Library grid/list navigation works.
- [ ] Game Modal can be closed and core controls can be used.
- [ ] Dashboard and Settings remain navigable.
- [ ] Focus outline is visible on TV distance.

## Export, profile, and data safety

- [ ] Export data works.
- [ ] Import/restore local app data does not crash.
- [ ] Profile page loads saved username/avatar/preferences.
- [ ] Settings toggles persist after restart.
- [ ] Theme selection persists after restart.
- [ ] No backend/account/cloud dependency is required for core functionality.

## Performance and polish

- [ ] App remains responsive with a large library.
- [ ] Home loads quickly after scan.
- [ ] Library filter/search remains usable.
- [ ] No obvious layout overflow at 1080p.
- [ ] No obvious layout overflow in big-screen mode.
- [ ] No repeated console errors during normal navigation.
