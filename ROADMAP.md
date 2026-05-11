# GamePilot Local-First Roadmap

## Product North Star
GamePilot should reward players for actually using their library through GamePilot: discover a game, launch it, earn a small launch reward, track the real session through to close, earn the meaningful session reward, unlock rewards, build a unique player identity, and return for fresh goals, recommendations, and discovery.

---

## What Already Exists ✅
- **Local-first Electron + React architecture** with localStorage persistence
- **XP/achievement system** with progression unlocks gating themes, audio, button packs, profile identity rewards, and presentation rewards
- **Home recommendation loop** with Perfect Play, Surprise Me, Rediscover, and Continue Playing
- **Behavior/profile systems** that already track moods, genres, session length, and persona signals
- **Rotating daily/weekly/monthly/yearly achievement infrastructure** and UI support
- **Static achievement categories** already exist separately from the rotating time-based pools
- **Stats, profile, favorites, export/import,** and gaming identity foundations
- **HowLongToBeat + Session Fit** with local caching, Library chips, Home session-fit ranking, and Settings toggle
- **Disk Usage / Storage Manager** with folder-size lookup, Library disk chips, and Settings toggle
- **Library Worth** with value export/share surfaces and stored price support
- **Year in Review** with local yearly snapshots, recap UI, and exportable recap imagery
- **Free Games Radar** with optional Epic free-to-keep discovery and local cache
- **Steam Patch & News Radar** with Library badges, Game modal panel, local cache, and Settings toggle
- **Wishlist & Price Alerts** with CheapShark search/prices, background stale refresh, alert summaries, Home section integration, and Settings toggle
- **Recommendation explainability** with shared local-signal reasons across Home recommendation cards and result sections
- **Unified goals snapshot** composing Daily Missions, weekly quests, Challenge Board, and quest history into the Home Daily Loop
- **Local Save Backup foundation** with PCGamingWiki save/config path candidates, user-chosen local backups, manifest history, and non-destructive restore preflight

---

## Biggest Gaps To Close 🔧

### Recommendation Explainability
- Core Home recommendation surfaces now share human-readable "why this?" explanations with local signals like rating, playtime, launch count, recency, persona, hardware, mood, and genre
- Remaining work is outcome learning: Continue Playing, Rediscover, Surprise Me, and future buy recommendations should learn more from completed sessions and feedback

### Wishlist Reliability
- Wishlist search, add/remove, manual thresholds, price caching, background stale refresh, and price-drop alert summaries are implemented
- Remaining work is deeper notification polish and optional threshold controls beyond the current local alert summary
- The current implementation uses CheapShark instead of ITAD because it works better for anonymous browser/Electron price lookups without user API keys

### Preservation Features
- PCGamingWiki save/config path lookup now seeds a local Save Backup panel in GameModal
- GamePilot can validate candidate save/config folders, open them, create timestamped local backups to a user-chosen folder, write manifest JSON, show local backup history, and run a non-destructive restore preflight
- Full restore remains intentionally disabled until overwrite safety, game-running checks, and explicit user confirmation are implemented

### Unified Goals / Quests
- Daily missions, weekly retention quests, Challenge Board primary challenges, and quest history now have a unified Home summary via `UnifiedGoalsService`
- Remaining work is deeper Year in Review consumption and richer user-curated goal editing

### Platform UX Expansion
- Big-screen/controller mode has a Settings toggle and partial controller navigation, but still needs a dedicated leanback shell and consistent focus states
- Achievements aggregation, buy recommendations, full restore safety, and TV mode remain larger follow-up tracks

---

## Recommended Build Order

### Phase 1: Data Integrity + Fair Progression ✅ COMPLETED
**Goal:** Make GamePilot trustworthy.

#### Completed Tasks
- ✅ Made session end authoritative: launched, observed running, observed closed
- ✅ Kept small launch reward (~10 XP), reserved playtime credit and main progression for session completion
- ✅ Defined canonical session event model with PlaytimeAutoLogger and GameProcessMonitor
- ✅ Ensured achievements, stats, profile updates, and most XP flow from session completion data
- ✅ Fixed Ubisoft Connect scanning with registry-based discovery
- ✅ Performance page accuracy improvements
- ✅ GameModal layout rebalancing

---

### Phase 2: Stats Backbone ✅ COMPLETED
**Goal:** Make every screen read from the same reliable history.

#### Completed Tasks
- ✅ Created canonical stats aggregation model from session history (`StatsAggregationService.js`)
- ✅ Support daily, weekly, monthly, yearly, and all-time views for:
  - Playtime
  - Sessions
  - Games played
  - Moods/genres used
  - Feature usage
  - Streaks/active days
- ✅ Made Achievements, Stats, Home, and Profile consume the same aggregated data
- ✅ Prepared yearly snapshots for future recap generation
- ✅ Enhanced session metadata tracking (platform, mood, genres, launch method)

---

### Phase 3: Recommendation + Identity Loop ✅ EXPLAINABILITY SHIPPED / OUTCOME POLISH REMAINS
**Goal:** Make GamePilot feel smarter the more it is used.

#### Current Status
- ✅ Recommendation services and Home recommendation surfaces exist
- ✅ Session Fit recommendations use HowLongToBeat data and local playtime context
- ✅ Persona/profile systems feed identity and behavior context
- ✅ Shared recommendation explanations now surface local reasons across Home shelves and recommendation result sections
- 🔄 Recommendation ranking uses several useful signals, but still needs deeper outcome learning
- 📝 Continue Playing / Rediscover / Surprise Me should more visibly learn from completed sessions, not just launches

#### Remaining Tasks
- 🔄 Strengthen recommendation ranking using:
  - Session success/completion signals
  - Recency/fatigue penalties
  - Mood/genre affinity
  - Session-length fit
  - Hardware fit
- ✅ Tighten the connection between profile persona and recommendation reasons
- ✅ Expose clearer "why this game?" explanations across Home recommendation cards and result sections
- 📝 Let Continue Playing / Rediscover / Surprise Me learn from actual session outcomes, not just launches

#### Key Deliverables
- Smarter recommendation algorithm
- Clear recommendation reasoning
- Learning from session outcomes
- Enhanced persona integration

---

### Phase 4: Reward Economy Expansion ✅ MOSTLY IMPLEMENTED
**Goal:** Make progression worth chasing.

#### Completed / Implemented
- ✅ XP/level remains the main spine
- ✅ Expanded unlockables beyond themes/audio to include:
  - Profile frames / banners / titles
  - Achievement showcase slots
  - Card styles / library presentation variants
  - Homepage layout variants
  - Recommendation pack cosmetics
- ✅ Reward categories now include gameplay, cosmetic, and utility/presentation rewards
- ✅ Patreon/support boosts remain cosmetic or XP-focused rather than direct content bypasses

#### Remaining Polish
- 🔄 Make reward unlocks more visible from Home and Profile
- 🔄 Ensure selected layout/card/recommendation variants are consistently applied across all relevant screens
- 🔄 Improve reward preview UX so progression feels more desirable

#### Reward Types
  - Gameplay rewards (XP, achievements, levels)
  - Cosmetic rewards
  - Utility rewards (layout/filter presets, profile options, functional presentation unlocks)

#### Key Deliverables
- ✅ Expanded reward catalog
- ✅ Profile customization options
- ✅ Layout and presentation unlocks
- 🔄 Clearer reward discoverability and cross-screen consistency

---

### Phase 5: Retention Features 🔄 PARTIALLY IMPLEMENTED / GOALS CONSOLIDATED
**Goal:** Create reasons to return daily/weekly/monthly.

#### Completed / Implemented
- ✅ Permanent static achievements remain separate from rotating daily/weekly/monthly/yearly assignments
- ✅ Rotating achievements, daily missions, Challenge Board, retention quests, and quest history foundations exist
- ✅ Unified local goals snapshot now composes Daily Missions, weekly quests, Challenge Board primary challenges, and quest history for Home
- ✅ Year in Review exists as a dedicated local recap page
- ✅ Exportable recap imagery exists
- ✅ Year in Review includes top games, playtime by period, mood/genre trends, persona evolution, achievement highlights, quest counts, and progression milestones

#### Remaining Tasks
- � Deepen rotating daily/weekly/monthly/yearly achievements around real play behavior
- ✅ Unify rotating achievements, daily missions, Challenge Board, retention quests, and user-pinned goals into one coherent goals summary model
- � Add deeper "GamePilot Picks" and "Your Weekly Quest" polish:
  - System-generated from profile/recommendation data
  - User-pinned goals/collections
  - Optional weekly/monthly/yearly challenge lists

#### Key Deliverables
- 🔄 Enhanced rotating achievements
- 🔄 Weekly quest system
- 📋 User-curated goals
- ✅ Year in Review feature
- ✅ Exportable recap cards

---

### Phase 6: Leanback / Controller Mode � EARLY PARTIAL
**Goal:** Make GamePilot usable from a couch/TV setup.

#### Current Status
- ✅ Big Screen/Controller Mode toggle exists in Settings
- 🔄 Controller navigation exists in parts of the app, including Library/Profile flows
- 📋 Dedicated leanback shell still needs to be built

#### Remaining Tasks
- 📋 Build as an in-app TV mode toggle that swaps to a leanback layout
- 📋 Focus on:
  - D-pad navigation
  - Large cards and focus states
  - Quick launch flows
  - Favorites/collections/recently played
  - Simplified stats and recommendation views
- 📋 Treat this as later phase once data and progression loop are stable

#### Key Deliverables
- ✅ TV mode toggle
- 🔄 Controller navigation
- 📋 Leanback UI layout
- 📋 Simplified controller-friendly interfaces

---

## Additional Feature Track: Free Games Discovery � PARTIALLY IMPLEMENTED
**Goal:** Help users discover free games across supported launchers without turning GamePilot into a full store.

#### Completed / Implemented
- ✅ Lightweight Epic free-games radar exists
- ✅ Free-to-keep promotions are surfaced as an optional Library section
- ✅ Cached locally with short TTL

#### Remaining Tasks
- � Keep this lightweight and discovery-focused rather than building a storefront
- � Show a simple "Free Games" surface for supported launchers when reliable data is available
- ✅ Start with free-to-keep promotions first, because they best match retention and urgency
- 📋 Expand later into permanently free-to-play discovery where launcher data is reliable enough
- 📋 Prioritize launcher/source adapters that expose stable public data or safe read-only integrations
- � Treat as optional enrichment layered onto Home or discovery tab, not core dependency
- ✅ Store only user preferences and cached results locally when needed

#### Key Deliverables
- ✅ Free games discovery surface
- ✅ Free-to-keep promotion tracking
- 📋 Additional launcher integration for free game data
- 🔄 Lightweight discovery features

---

## Feasibility Assessment

### High Confidence ✅
- Progression-first XP unlocks
- Richer stats screens
- Rotating achievements
- Profile/persona improvements
- Recommendations getting better from local behavior
- Year in Review from stored local history
- Favorites plus curated collections/goals

### Medium Difficulty 🔧
- Robust automatic close detection across Steam/Epic/Xbox/Battle.net/GOG and launcher edge cases
- Consolidating duplicate/overlapping stat sources without regressions
- Making recommendations feel consistently "smart" rather than random
- Free-games discovery across launchers (data availability varies by platform)

### Highest Difficulty ⚠️
- Polished controller-first / big-screen UX
- Perfectly reliable process monitoring for every launcher and every game install shape

**Note:** None of this requires a backend if the product stays single-user, local-first, and device-local.

---

## Suggested Immediate Priorities 🎯

1. **Authoritative session tracking** ✅ (Completed)
2. **Unified stats aggregation** ✅ (Completed)
3. **Fair XP model** ✅ (Completed - small launch reward + session-based progression)
4. **Recommendation explainability pass** ✅ (Phase 3 polish shipped; outcome learning remains)
5. **Finish wishlist price-drop alerts and background refresh** ✅ (Librarian track foundation shipped)
6. **Unify weekly/monthly goals, quests, and collections** ✅ (Focused Home + separate Dashboard split shipped; deeper editing remains)
7. **Local save backup & restore** 🔄 (Backup creation, history, restore preflight, and safety checklist shipped; destructive restore still intentionally disabled)
8. **Achievements aggregator** 🔄 (Steam public rarity preview + separate personal cache scaffold shipped; import/merge and GOG remain later)
9. **Buy recommendations** 🔄 (Opt-in local wishlist ranking scaffold shipped; external catalog/price enrichment remains later)
10. **Big-screen/controller mode** (Phase 6)

---

## Confirmed Product Decisions ✅

- **XP model:** Small launch reward + larger session-based reward ✅
- **Goals:** Both GamePilot automation and user curation
- **Unlocks:** Both cosmetic and functional presentation rewards
- **Year in Review:** Both in-app page and exportable recap cards/images
- **TV mode:** Toggle inside the normal UI
- **Free games discovery:** Start with free-to-keep promotions, expand to permanently free where data allows
- **Achievement design:** Permanent static achievements alongside rotating daily/weekly/monthly/yearly assignments

---

## Current Status: Phase 3-5 Consolidation 🚀

**Completed:** Phases 1-2 (Data Integrity + Stats Backbone), recommendation explainability pass, wishlist reliability/background alerts, opt-in local Buy Recommendations scaffold, focused Home/Dashboard split, unified goals summary, non-destructive save backup/preflight/safety foundation, and Steam public achievement-rarity aggregation preview with separate personal unlock cache/display scaffold
**Mostly Implemented:** Phase 4 (Reward Economy Expansion), Phase 3 (Recommendation + Identity Loop), Wishlist Price Alerts, Local Save Backup foundation
**Partially Implemented:** Phase 5 (Retention Features), Free Games Discovery, Disk Usage, Library Worth
**Next:** Choose between safe personal achievement import/merge design, external Buy Recommendations enrichment, guarded restore implementation, or Phase 6 leanback/controller shell

*Last Updated: May 6, 2026*
*Version: 1.3.x active development*

---

# Phase 5+ — The "Librarian of Everything" Push
*Added April 27, 2026 — v1.3.x planning horizon*

## Thesis
> GamePilot is the only application that tells a PC gamer the truth about their library — what's worth playing tonight, what's gathering dust, what's about to get cheaper, how long things will take, and how much of their time and money has actually been well spent. All without phoning home.

Every feature below must reinforce that sentence. If it doesn't, cut it.

---

## Tier 1 — Next to Ship (biggest impact per hour)

### 1. HowLongToBeat × Session-Fit Recommendations ✅ MOSTLY SHIPPED
- **What:** Fetch main / main+extra / completionist times from HLTB per game. Display beside every title. Use in "what to play tonight" logic: user sets available minutes, GamePilot suggests games where that chunk makes meaningful story/chapter progress.
- **Why:** Nobody else ties "I have 90 minutes" to "here are 3 games where you'd actually finish something." Massive "this is smart" moment.
- **Scope:** New `HowLongToBeatService` with local cache (14-day TTL), UI chip on game cards, integration into Home session-fit picker, settings toggle for API fetches.
- **Risk:** HLTB has no official API — use the well-known unofficial endpoint with graceful fallback when it changes.
- **Status:** Implemented with `HowLongToBeatService`, `HLTBChip`, `SessionFitSection`, local cache, warmup, and Settings toggle. Remaining work is resilience/polish.

### 2. Disk Usage & Uninstall Coach 🔄 PARTIALLY SHIPPED
- **What:** Read `installDir` folder size per game. Cross with last-played. Panel: *"Red Dead 2 — 150 GB, last played 14 months ago. Reclaim 150 GB?"* Treemap view of library size. Quick uninstall launches the platform's native uninstaller.
- **Why:** SSD pain is universal. Steam buries this; GamePilot surfaces it tied to playtime data nobody else has.
- **Scope:** New `DiskUsageService` (Electron main-process `fs.stat` walker with throttling), new Library tab "Storage", uninstall launch routing per platform.
- **Status:** Disk usage service, Storage Manager navigation, Library disk chips, and Settings toggle exist. Remaining work is uninstall routing polish and deeper storage coaching.

### 3. Restore & Reframe Library Value 🔄 PARTIALLY SHIPPED
- **What:** Bring back the value-per-hour and cost-vs-played insight. Rebrand as *"Library Worth"* — emphasize discovery of hidden gems and true value, not regret.
- **Why:** Only GamePilot sees spend across all launchers. Highest-leverage insight in the product.
- **Scope:** Per-game price field (manual + optional ITAD lookup), cost-per-hour calc using existing session data, "Best value games you haven't played" surface on Home.
- **Status:** `LibraryValueService`, `LibraryValueModal`, currency utilities, and stored game price support exist. Remaining work is stronger Home placement and value-per-hour coaching.

### 4. Wishlist & Price-Drop Alerts ✅ RELIABILITY FOUNDATION SHIPPED
- **What:** User adds wanted games. GamePilot refreshes CheapShark price data, caches results locally, and surfaces Home/Wishlist alert summaries when prices drop below target thresholds.
- **Why:** Pairs naturally with Buy Recommendations (#7). Every user checks prices manually today; GamePilot automates it.
- **Scope:** New `WishlistService`, CheapShark client, daily/idle refresh, notification via existing toast infra, Settings section for tracking toggle and threshold controls.
- **Status:** Search, add/remove, thresholds, CheapShark lookup, Settings toggle, Home section, background stale refresh, alert summary persistence, alert badges, and build verification are complete. Remaining work is richer notification delivery and deeper threshold UX.

### 5. Achievements Aggregator (Steam first, GOG second) 🔄 STEAM PREFLIGHT FOUNDATION SHIPPED
- **What:** Unified achievements view across launchers. Show total completion %, rarest unlocked, in-progress chains. Extend existing `AchievementSystem`.
- **Why:** Steam users see Steam, GOG users see GOG. Nobody sees both together. Good retention/nostalgia hook.
- **Scope:** Steam public rarity preview first, then optional Steam Web API personal unlock sync (user-provided API key), GOG Galaxy local SQLite reader, merge adapter, UI under Stats/Achievements.
- **Risk:** Xbox is hard (no public API); ship without it, label as "coming soon."
- **Status:** Steam-first foundation is shipped as a local Achievements-page preview using anonymous global achievement rarity already cached by `SteamPublicService`. It summarizes owned Steam coverage, cached public rarity totals, rarest known game, and a manual small-batch refresh. A second layer now supports optional local-only Steam Web API key + SteamID64 settings, sample personal unlock checks, a separate `steamPersonalAchievementCacheV1`, and an Achievements-page Steam completion summary joined with public rarity where available. It still does not merge Steam unlocks into GamePilot achievements or XP. Remaining work is a safe explicit import/merge model, overwrite/conflict rules for broader personal unlock refresh, and later GOG local integration.

### 6. Local Save Backup & Restore 🔄 BACKUP + PREFLIGHT SHIPPED
- **What:** Detect known save-folder locations per game. One-click backup to user-chosen drive/folder. Scheduled auto-backup option. Restore from picker.
- **Why:** Single-player audience will evangelize this. Steam Cloud charges Valve for egress; GOG charges; GamePilot is free and universal.
- **Scope:** `SaveLocationRegistry` seeded with known paths (`%APPDATA%\...`, `%USERPROFILE%\Saved Games\...`, etc.), zip to destination, manifest JSON, Restore UI with diff/preview.
- **Status:** PCGamingWiki save/config path lookup now seeds Save Backup in GameModal. GamePilot validates candidate folders, opens them, creates timestamped user-chosen backups, writes manifest JSON, records local manifest history, and runs non-destructive restore preflight against live target folders. Restore safety now surfaces active-session/game-running blockers, missing-backup blockers, overwrite approval requirements, and mandatory fresh live-backup/typed-confirmation requirements. Full restore remains intentionally disabled until the actual guarded copy/overwrite implementation is built.

### 7. Buy Recommendations (user-toggled) � LOCAL SCAFFOLD SHIPPED
- **What:** Separate Home section: "3 games you'd probably love, based on your actual play patterns." Uses local profile data (genres stuck-with, mood fits, abandoned genres, completion patterns) to score catalog games from IGDB + cross-reference ITAD prices.
- **Why:** Plausibly better than Steam's recommender for three reasons:
  1. Cross-launcher truth — Steam only knows Steam playtime
  2. Explicit intent + abandonment data — Steam infers, GamePilot observes
  3. Zero commercial incentive — no publisher pays for placement
- **Scope:**
  - New `BuyRecommendationService` — reuses existing local library, wishlist, and recommendation entry patterns
  - IGDB catalog client (free tier, Twitch OAuth)
  - ITAD/CheapShark price lookup shared with wishlist
  - Settings toggle: "Show buy recommendations"
  - Clear labeling: "external catalog lookup enabled"
- **Status:** Opt-in local scaffold shipped. Settings now exposes Buy Recommendations off by default, Home includes a reorderable Buy Recommendations section, and the first ranking pass scores local Wishlist entries from owned-library taste signals plus cached wishlist price context only. It does not call external catalog APIs, open stores, purchase anything, or send play history anywhere. Remaining work is external catalog discovery beyond Wishlist, richer price/deal enrichment, and stronger explanation/feedback loops.

---

## Tier 2 — Strong Differentiators (ship after Tier 1 is stable)

### 8. Time-of-Day Heatmap
7×24 calendar grid of actual play minutes. Drives smarter daily-mission scheduling. Uses existing session log. ~2h build.

### 9. IGDB / OpenCritic Metadata Enrichment
Real review scores, richer tags, better cover art everywhere. Extend `resolveGameArtwork`. Lifts perceived quality across the whole app.

### 10. On-This-Day / Nostalgia Replay
"One year ago today you played Sekiro for 2.4h." Small Home card. Cheap, emotional, retention-positive.

### 11. Per-Game Patch Notes Feed
Steam has per-game RSS news. Aggregate for owned games. Small badge "3 updates." Dismissable.

### 12. Library Export (Markdown / CSV / JSON)
Bloggers, creators, year-end-recap posts. Single button in Settings → Export.

---

## Tier 3 — Quality-of-Life Extras

### 13. Mod Folder Detection
Presence check for Nexus / CurseForge / Vortex folders per game → "Modded" badge + reminder to back up saves before updates.

### 14. Controller-vs-Keyboard Per-Game Preference
Track and recommend best input per game based on prior session input data.

### 15. Recording/Streaming Detection
OBS / NVIDIA ShadowPlay process detection → tag sessions as "recorded" for content creators.

### 16. Launch-Success Metrics
Track per-launcher launch reliability. *"Epic first-try success 73%, Rockstar 41% — switch this game to direct exe?"* Actionable diagnostic.

---

## Explicitly NOT Shipping
- Social / friends / chat (use Discord link instead)
- A game store
- Cloud sync of user data (breaks local-first)
- Mobile companion app
- Live multiplayer matchmaking

---

## Sequencing Recommendation
1. **v1.4** — Ship Tier 1 #1 (HLTB) standalone. Prove the pattern: external catalog data × local behavior signals × crisp UI.
2. **v1.5** — Ship Tier 1 #2 and #3 (Disk Coach + Library Worth restore) together — they share the "truthful insight" panel.
3. **v1.6** — Ship Tier 1 #4 + #7 (Wishlist + Buy Recommendations) as a paired "watching the market" release with ITAD as shared infra.
4. **v1.7** — Ship Tier 1 #5 + #6 (Achievements + Save Backup) as "preservation & pride" release.
5. **v1.8+** — Tier 2 as polish drops.
6. **v2.0** — Tier 3 + UX unification pass.

---

## Local-First Guardrails (apply to every new feature)
- **No user data leaves the device.** Outbound requests only for catalog / prices / metadata, never with user identifiers.
- **Every API integration has a settings toggle** defaulting OFF for data-fetching features that aren't essential.
- **Graceful offline fallback.** Cached last-known values; explicit "offline" state in UI; no broken flows.
- **Cache aggressively** (14-day TTL for HLTB/IGDB, 24h for prices).
- **User owns their API keys** (Steam, IGDB/Twitch) — stored locally, never transmitted to GamePilot infra (there is none).

---

*Appended: April 27, 2026*
*Planning Version: 1.3.x → 2.0*
