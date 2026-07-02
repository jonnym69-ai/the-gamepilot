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
