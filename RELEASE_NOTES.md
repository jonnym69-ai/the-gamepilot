# GamePilot v1.12.0 Release Notes

## Highlights

v1.12 turns GamePilot into a tracker and deepens the story: a vitals readout for your gaming rhythm, a day-one history for brand-new installs, a wishlist that out-guns Steam's own, and a game modal that finally shows everything it knows.

## What's new

- **Gaming vitals** — a tracker-style card on Home: tonight's sessions vs rest days, deep/steady/hop session mix, your usual start time, streaks, and this week vs your own baseline. Descriptive, never judgemental.
- **Your history so far** — a day-one read built from imported Steam/GOG/Epic playtime: total hours, most-played elsewhere, per-launcher spread, latest activity. New installs get a real story immediately; it steps aside once live sessions take over.
- **Wishlist, upgraded**
  - Per-store comparison — every offer CheapShark returns, cheapest first, with per-store deal links.
  - Local price history + sparkline — each daily check becomes a data point; chart with all-time-low marker.
  - Buy/wait verdicts per card ("Historic low — buy now", "Historically cheaper").
  - Steam review chip ("Very Positive · 92%") via the reviews bridge.
  - Sort (ranking/price/discount/added/name/release), on-sale filter, drag-to-rank ordering, and a wishlist total + potential savings line.
- **Game modal depth** — per-game memoir (sessions, longest run, era, completion, signature title), Steam trailers, owned-game SteamSnapshot, your local Steam screenshots, and a friends-played comparison from public Steam libraries.
- **Native notifications** — opt-in toasts when a friend starts a game you own (background watcher, deduped) and when a wishlist game hits your price or a new low. Toggle in Settings.
- **SteamGridDB artwork** — bring your own free SGDB key and browse grids/heroes/logos per game from Edit details → cover art.
- **Launch options + attachments** — launch arguments and alternative executables per game; attach manuals/links and open them from the modal.
- **Duplicate manager** — merge same-title copies across launchers with a preferred-launch pick; unmerge restores.
- **Completion shelves** — Now Playing / Beaten / The Backlog join the library carousel.
- **Gaming diary** — one feed of journal notes, firsts, finishes, and era chapter-breaks; consecutive same-name eras collapse into one earliest onset.
- **Wrapped persona share card** — copy/save the persona verdict slide as a 1080×1080 card.
- **Launcher hardening** — emulator paths self-heal (installer-exe and missing-exe detection), emulated launches write diagnostics, secondary accent can reach headers/borders/text.

## Linux note

The Linux build remains paused — still Steam-only and unverified on real hardware. No AppImage or `latest-linux.yml` ships with v1.12.0; `latest.yml` on the Windows release feeds the updater.

## Known issues

- The Windows installer is unsigned (SmartScreen warning expected).
- Price history is self-accumulated — sparklines fill in over days, not retroactively.
- Some remote game covers may fall back to landscape artwork or a generated placeholder.

---

# GamePilot v1.11.0 Release Notes

## Highlights

v1.11 makes big screens count and turns the wishlist into a release radar: full-width layouts, release countdowns, a Profile showcase, and a proper share card for your player profile.

## What's new

- **Full-width layouts** — pages now use the screen on large monitors (fluid up to ~1800px instead of a fixed centre column), with extra cards filling the space rather than stretching.
- **Wishlist release tracking** — countdown chips on wishlist games, a "Releasing soon" group, a Today-strip next-release chip, and a release-day notification with a "View on Steam" action. Toggle in Settings. Vague Steam dates ("Q1 2027") stay vague — no invented countdowns.
- **Profile Showcase** — pin your top six games beside your persona. Auto-fills from most-played; "Edit picks" opens a searchable picker to choose your own.
- **Share Profile** — the header's share menu now exports a purpose-built profile card (persona + showcase) through the same copy/save/Discord/native-share pipeline as the other share cards, replacing the Cinematic Poster.
- **Two-column Profile on wide screens** — persona and showcase sit side by side; expanded sections span the row.
- **Security/maintenance** — patched Electron (cert-store mitigation), Vite and `systeminformation`, plus forced fixed versions for `sharp`, `toml` and `zod`. The unused `netlify-cli` dev dependency (and ~1000 transitive packages) was removed — audit now reports zero high-severity findings.

## Linux note

The Linux build remains paused — still Steam-only and unverified on real hardware. No AppImage or `latest-linux.yml` ships with v1.11.0; `latest.yml` on the Windows release feeds the updater.

## Known issues

- The Windows installer is unsigned (SmartScreen warning expected).
- Some remote game covers may fall back to landscape artwork or a generated placeholder.

---

# GamePilot v1.10.0 Release Notes

## Highlights

GamePilot now updates itself, protects your play record, and lets you fix the library when scans get it wrong — plus your own Steam achievements alongside your own session data.

## What's new

- **Auto-update**
  - Checks GitHub Releases on launch and every six hours; downloads and installs are user-initiated.
  - Settings → About shows the current version, a manual check button and download progress.
  - Winget and Scoop manifests ship in `packaging/` for community package installs.

- **Edit game details**
  - Per-game overrides for sort name, genres, tags, release year, developer, publisher, cover art and hidden state.
  - Overridden genres flow into mood, filters and recommendations; "Reset to scanned" restores everything.
  - Pencil button in the game modal header; the scanned values are kept as placeholders.

- **Your Steam achievements**
  - Per-game unlocked/total with global rarity and unlock dates inside the game's Steam snapshot.
  - Uses your saved Steam ID and sits behind the existing Steam online opt-in; private profiles get a pointer, not an error wall.

- **Session-history protection**
  - SQLite history is guarded against empty or truncated writes; the renderer re-syncs from disk if a write is refused.
  - Rolling backups in `userData/session-backups` (startup + before bulk replaces, kept to ten), with a restore panel in Settings → Backup & Restore.
  - Backup imports force the replace so restoring an older, smaller export still works.

- **Bug fixes**
  - Library card "Hide" button now actually hides the game (it was passing the wrong argument).
  - Settings scan report shows real per-platform counts and error reasons again.
  - Updater failures show a one-line reason instead of a raw HTTP dump.

- **Housekeeping**
  - Renderer surface consolidation continues: trusted IPC guard, Epic/itch account bridges, install watcher, storage cleaner, owned-backlog shelf and Trending page are live; the retired XP/quest, seasonal and engagement-widget surfaces were removed.
  - README re-led with the tracking story first.

## Linux note

The Linux build stays in the tree but is paused for this release — it's Steam-only and unverified on real hardware, so no AppImage or `latest-linux.yml` is published with v1.10.0. `latest.yml` on the Windows release feeds the updater.

## Known issues

- The Windows installer is unsigned (SmartScreen warning expected).
- Auto-update activates with this release: installs of 1.9.1 will see 1.10.0 once the release is published, but this build itself needs a *following* release to test the download path end-to-end.
- Some remote game covers may fall back to landscape artwork or a generated placeholder.

---

# GamePilot v1.9.0 Release Notes

## Highlights

Version 1.9 turns GamePilot into a more focused gaming-backlog companion. Recent play now drives the active persona and recommendations, the Hall of Champions records the games that define each week and month, and Year in Review presents that history as a visual annual story.

## What's new

- **Recent-play gaming personas**
  - Adaptive recent sessions now lead the default persona instead of stale lifetime favourites.
  - Themes such as survival, horror, zombies, space, fantasy, strategy, and cozy play contribute to hybrid persona labels.
  - Persona evidence, confidence, contextual game references, and roast selection are grounded in tracked play.
  - The Profile page retains an explicit all-time mode for retrospective identity.

- **Hall of Champions**
  - Weekly, monthly, and yearly champions are calculated from tracked sessions using calendar periods.
  - Portrait-led history shows hours, sessions, longest sitting, share of period play, total period activity, and runner-up margin.
  - Past periods are locked as local time capsules while old records are enriched from retained session history.
  - Individual champions, filtered collections, and annual champion boards can be copied, saved, or shared as images.

- **Expanded Year in Review**
  - A Champion Journey surfaces the annual winner and monthly champion covers.
  - Annual details include total hours, sessions, longest sitting, and percentage of yearly play.
  - Champion data is included in local Year in Review exports.

- **Smarter recommendations**
  - A new “Because you played” shelf connects recently played games to similar backlog candidates.
  - Recommendation scoring considers recent rotation, tags, genres, ratings, favourites, commitment, shelf age, repeat behaviour, and recent exposure.
  - Explanations are more closely tied to the evidence used for each recommendation.

- **Achievement overhaul**
  - Curated attainable achievements replace stale and unreachable legacy definitions.
  - Theme and backlog achievements recognise current behaviour.
  - Rarity, consistent XP rewards, category filters, sorting, and locked/unlocked views are now surfaced.
  - Genre tracking accepts valid normalized genres instead of dropping values outside a fixed allowlist.

- **Library and interface cleanup**
  - Removed duplicated, disconnected, and unused pages, services, and components.
  - Home, recommendations, library, profile, stats, rewards, settings, and big-screen surfaces were consolidated around the core decision-making flow.
  - Game cards favour portrait artwork except where a wide surface is intentional.
  - Gaming Links and practical library tools are surfaced through the streamlined navigation.

- **Session and storage hardening**
  - Session history is deduplicated and persisted through the local session repository.
  - Existing champion artwork and detailed metrics are migrated without discarding frozen persona snapshots.
  - User data remains local and is preserved by uninstall unless manually removed.

- **Linux / Steam Deck beta groundwork**
  - Steam library discovery covers standard Linux, Flatpak Steam, and removable-media paths.
  - Steam protocol launching and Proton-aware process matching provide the initial handheld path.
  - Linux is intentionally Steam-first while Windows-only launchers remain unsupported.

## Known issues

- Linux and Steam Deck support remains beta until validated on physical hardware.
- The Windows installer is unsigned and may trigger Microsoft SmartScreen.
- Some remote game covers may fall back to landscape artwork or a generated placeholder.
- Windows-only launchers and system tools are unavailable in the Linux beta.

## Verification

- 23 test suites passing.
- 336 automated tests passing.
- Production React build completes successfully.
- Windows NSIS installer builds successfully.
- Linux x64 AppImage built successfully on a Linux container and passed a headless Electron startup smoke test.

---

# GamePilot v1.7.0 Release Notes

## Highlights

This release focuses on polishing the home page, making the gaming identity feel grounded in real data, and removing unused audio assets to reduce install size.

## What's new

- **Gaming identity grounded in real play data**
  - Identity label is now based on your most-played genre, with game count, total hours, and top played games.
  - Example: "Strategy Main — 12 Strategy games, 240h played. Top games: Civilization VI (95h), XCOM 2 (62h)."

- **Taste clusters on the home page**
  - Habit Insights now surfaces emergent taste clusters such as Souls-like Specialist, Run Chaser (roguelikes), Precision Platformer, and Survival Architect.
  - Clusters are detected from your actual signature games and only appear when 2+ games match.

- **Improved mood insights**
  - Shows your top 3 moods instead of a single dominant mood.
  - "Sessions" label replaces the misleading "picks" count.

- **Cleaner smart shelves**
  - Removed duplicate smart shelves (Discovery, Weekend Ready) to reduce overlap and keep the home page focused.

- **Reduced install size**
  - Removed the Audio Reward Catalog and bundled `public/audio` assets.
  - Removed audio-themed collections from CollectionsService.

- **Technical improvements**
  - Core recommendation path no longer depends on the heavy hardware database.
  - Secondary and Labs routes are lazy-loaded for faster initial startup.

- **Restored**
  - Rewards page is back — view unlocked card styles, themes, layouts, personas, and progression rewards.

## Removed

- Audio Reward Catalog (`src/services/AudioRewardCatalog.js`)
- Bundled audio assets (`public/audio/`)
- Audio-themed collections: Audio Master, Button Maestro, Atmospheric Wanderer, Melody Seeker

## Known issues

- The web-browser build may show placeholder/empty data in some sections if no library scan has been performed in the Electron environment.
- Performance Cockpit remains a Labs feature and is still loaded lazily.

## Verification

- All 220 tests passing.
- Production build (`npm run build`) completes successfully.
- Electron startup verified on Windows.
