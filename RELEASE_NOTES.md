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
