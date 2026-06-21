# GamePilot Roadmap

## Product North Star
GamePilot rewards players for actually using their library: discover a game, launch it, earn a small launch reward, track the real session through to close, earn the meaningful session reward, unlock rewards, build a unique player identity, and return for fresh goals, recommendations, and discovery. All local-first, no phoning home.

---

## What Already Exists ✅
- **Local-first Electron + React architecture** with localStorage persistence
- **XP/achievement system** with progression unlocks gating themes, audio, button packs, profile identity rewards, and presentation rewards
- **Home recommendation loop** with Perfect Play, Surprise Me, Rediscover, and Continue Playing
- **Behavior/profile systems** tracking moods, genres, session length, persona signals
- **Rotating daily/weekly/monthly/yearly achievements** plus static permanent achievements
- **Stats, profile, favorites, export/import,** and gaming identity foundations
- **HowLongToBeat + Session Fit** with local caching, Library chips, Home session-fit ranking, Settings toggle
- **Disk Usage / Storage Manager** with folder-size lookup, Library disk chips, Settings toggle, and uninstall coach
- **Library Worth** with value export/share surfaces, stored price support, and Home coaching
- **Year in Review** with local yearly snapshots, recap UI, and exportable recap imagery
- **Free Games Radar** with optional Epic free-to-keep discovery and local cache
- **Steam Patch & News Radar** with Library badges, Game modal panel, local cache, Settings toggle
- **Wishlist & Price Alerts** with CheapShark search/prices, background stale refresh, alert summaries, Home section integration, Settings toggle
- **Recommendation explainability** with shared local-signal reasons across Home recommendation cards
- **Unified goals snapshot** composing Daily Missions, weekly quests, Challenge Board, and quest history into the Home Daily Loop
- **Local Save Backup & Restore** with PCGamingWiki path lookup, user-chosen backups, manifest history, preflight checks, typed confirmation, safety backups, and guarded restore execution

---

## Completed Build Phases

### Phase 1: Data Integrity + Fair Progression ✅
- Session end is authoritative (launched → observed running → observed closed)
- Small launch reward (~10 XP), main progression from session completion
- Canonical session event model with PlaytimeAutoLogger and GameProcessMonitor
- Ubisoft Connect registry-based discovery
- Performance page accuracy improvements

### Phase 2: Stats Backbone ✅
- Canonical stats aggregation from session history (`StatsAggregationService`)
- Daily, weekly, monthly, yearly, and all-time views for playtime, sessions, games played, moods/genres, feature usage, streaks/active days
- Achievements, Stats, Home, and Profile consume the same aggregated data
- Yearly snapshots for recap generation
- Enhanced session metadata (platform, mood, genres, launch method)

### Phase 3: Recommendation + Identity Loop ✅
- Recommendation services and Home surfaces exist
- Session Fit uses HowLongToBeat data and local playtime context
- Persona/profile systems feed identity and behavior context
- Shared recommendation explanations surface local reasons across Home shelves
- Persona tightly connected to recommendation reasons
- "Why this game?" explanations on recommendation cards

### Phase 4: Reward Economy Expansion ✅
- XP/level spine with expanded unlockables:
  - Profile frames, banners, titles
  - Achievement showcase slots
  - Card styles / library presentation variants
  - Homepage layout variants
  - Gaming Links layout variants
  - Recommendation pack cosmetics
- Reward categories: gameplay, cosmetic, utility/presentation
- Patreon boosts are cosmetic/XP-focused, never direct bypasses
- Gaming Identity enhancements: streaks, backlog stats, milestones, timeline, seasonal tags, genre archetypes, identity card export
- Prestige tiers (Silver → Gold → Platinum → Diamond)
- Special Events panel for birthday/Christmas/seasonal rewards
- Pilot Persona one-click multi-category presets

### Phase 5: Retention Features ✅
- Rotating daily/weekly/monthly/yearly assignments separate from static achievements
- Unified goals snapshot via `UnifiedGoalsService`
- Year in Review in-app page + exportable recap cards
- Nostalgia replay ("On this day" Home card)
- Patch notes badge for owned Steam games
- Time-of-day heatmap (7×24 grid in Stats)
- Library export (CSV, Markdown, JSON via Settings)

---

## Tier 1 — Librarian of Everything Track ✅ SHIPPED

| # | Feature | Status |
|---|---------|--------|
| 1 | HowLongToBeat × Session-Fit | ✅ `HowLongToBeatService`, `HLTBChip`, `SessionFitSection`, local cache, Settings toggle |
| 2 | Disk Usage & Uninstall Coach | ✅ `DiskUsageService`, Storage Manager, Library disk chips, `UninstallCoachService`, launcher deeplink uninstall |
| 3 | Restore & Reframe Library Value | ✅ `LibraryValueService`, `LibraryValueModal`, cost-per-hour, Home coaching surface |
| 4 | Wishlist & Price-Drop Alerts | ✅ Search, thresholds, CheapShark, background refresh, Home alerts, Settings toggle |
| 5 | Achievements Aggregator (Steam) | ✅ Public rarity preview + optional Steam Web API personal unlock cache + Achievements-page summary |
| 6 | Local Save Backup & Restore | ✅ Backup creation, manifest history, guarded restore with typed confirmation + safety backups |
| 7 | Buy Recommendations | ✅ Opt-in local wishlist ranking from owned-library taste + cached price context |

---

## Tier 2 — Strong Differentiators ✅ SHIPPED

| # | Feature | Status |
|---|---------|--------|
| 8 | Time-of-Day Heatmap | ✅ `TimeOfDayHeatmap` + `PlaytimeHeatmap` components wired into Stats |
| 9 | IGDB / OpenCritic Metadata Enrichment | ✅ `GameMetadataService` with opt-in IGDB (Twitch OAuth) and OpenCritic clients, local cache, Settings toggle |
| 10 | On-This-Day / Nostalgia Replay | ✅ `NostalgiaService` + `NostalgiaCard` on Home dashboard |
| 11 | Per-Game Patch Notes Feed | ✅ `PatchNotesService` + `PatchNotesBadge` on Home, Steam news API, 24h cache |
| 12 | Library Export (Markdown / CSV / JSON) | ✅ `LibraryExportService` wired into Settings with CSV, Markdown, and JSON export |

---

## Tier 3 — Quality-of-Life Extras

| # | Feature | Status |
|---|---------|--------|
| 13 | Mod Folder Detection | ✅ `ModFolderDetectionService` + `ModBadge`, known folder checks for Nexus/CurseForge/Vortex/etc. |
| 14 | Controller-vs-Keyboard Per-Game Preference | 📋 Not started |
| 15 | Recording/Streaming Detection | 📋 Not started |
| 16 | Launch-Success Metrics | 📋 Not started |

---

## Phase 6: Leanback / Controller Mode 🔄 PARTIAL

**Goal:** Make GamePilot usable from a couch/TV setup.

- ✅ Big Screen/Controller Mode toggle in Settings
- ✅ `ControllerSupport` hook with directional focus navigation, activation, and `big-screen-mode` class gating
- 🔄 Controller navigation works in Library/Profile flows
- 📋 Dedicated leanback shell with large cards, D-pad navigation, quick launch, and simplified views still needs to be built

---

## Remaining Polish & Follow-ups

### Recommendation Outcome Learning 🔄
- Continue Playing / Rediscover / Surprise Me should visibly learn from completed session outcomes, not just launches
- Recency/fatigue penalties, mood/genre affinity weighting, and hardware-fit tuning

### Reward Discoverability 🔄
- Make reward unlocks more prominent from Home and Profile
- Ensure selected layouts/cards/variants are consistently applied across all screens
- Improve reward preview UX

### Steam Achievement Merge 🔄
- Safe explicit import/merge model for personal Steam unlocks into GamePilot achievements/XP
- Overwrite/conflict rules for broader personal unlock refresh
- GOG Galaxy local SQLite reader (later)

### Buy Recommendations External Catalog 📋
- IGDB catalog discovery beyond Wishlist
- Richer price/deal enrichment
- Stronger explanation/feedback loops

### Free Games Discovery 📋
- Expand beyond Epic free-to-keep into permanently free-to-play where launcher data is reliable
- Additional launcher/source adapters

---

## Explicitly NOT Shipping
- Social / friends / chat (use Discord link instead)
- A game store
- Cloud sync of user data (breaks local-first)
- Mobile companion app
- Live multiplayer matchmaking

---

## Local-First Guardrails
- **No user data leaves the device.** Outbound requests only for catalog / prices / metadata, never with user identifiers.
- **Every API integration has a settings toggle** defaulting OFF for data-fetching features.
- **Graceful offline fallback.** Cached last-known values; explicit "offline" state in UI.
- **Cache aggressively** (14-day TTL for HLTB/IGDB, 24h for prices).
- **User owns their API keys** (Steam, IGDB/Twitch) — stored locally, never transmitted to GamePilot infra.

---

*Last Updated: May 14, 2026*
*Version: 1.4.x active development*
