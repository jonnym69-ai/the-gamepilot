# GamePilot Local-First Roadmap

## Product North Star
GamePilot should reward players for actually using their library through GamePilot: discover a game, launch it, earn a small launch reward, track the real session through to close, earn the meaningful session reward, unlock rewards, build a unique player identity, and return for fresh goals, recommendations, and discovery.

---

## What Already Exists ✅
- **Local-first Electron + React architecture** with localStorage persistence
- **XP/achievement system** with progression unlocks already gating themes, audio, and button packs
- **Home recommendation loop** with Perfect Play, Surprise Me, Rediscover, and Continue Playing
- **Behavior/profile systems** that already track moods, genres, session length, and persona signals
- **Rotating daily/weekly/monthly/yearly achievement infrastructure** and UI support
- **Static achievement categories** already exist separately from the rotating time-based pools
- **Stats, profile, favorites, export/import,** and gaming identity foundations

---

## Biggest Gaps To Close 🔧

### Reliable Session Truth
- Launch-to-close tracking is not yet authoritative across launchers/processes
- Some progress/time credit appears to be granted at launch, which weakens fairness

### Unified Stats Model
- Playtime, sessions, feature usage, behavior profile, rolling achievements, and profile identity need a clear single source of truth
- Daily/weekly/monthly/yearly stats should be derived consistently from recorded sessions

### Reward Depth
- Progression exists, but the reward catalog needs stronger motivation beyond themes/audio
- Profile customization, badges, layout unlocks, and cosmetic identity rewards would strengthen retention

### Retention Systems
- Rotating achievements exist, but they need to tie more directly into stats, recommendations, and progression goals
- Weekly/monthly/yearly "play this" goals and Year in Review are still net-new

### Platform UX Expansion
- Big-screen/controller mode is achievable, but it is a separate shell/navigation project rather than a small add-on

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

### Phase 3: Recommendation + Identity Loop 🔄 IN PROGRESS
**Goal:** Make GamePilot feel smarter the more it is used.

#### Planned Tasks
- 🔄 Strengthen recommendation ranking using:
  - Session success/completion signals
  - Recency/fatigue penalties
  - Mood/genre affinity
  - Session-length fit
  - Hardware fit
- 📝 Tighten the connection between profile persona and recommendation reasons
- 📝 Expose clearer "why this game?" explanations everywhere recommendations appear
- 📝 Let Continue Playing / Rediscover / Surprise Me learn from actual session outcomes, not just launches

#### Key Deliverables
- Smarter recommendation algorithm
- Clear recommendation reasoning
- Learning from session outcomes
- Enhanced persona integration

---

### Phase 4: Reward Economy Expansion 📋 PLANNED
**Goal:** Make progression worth chasing.

#### Planned Tasks
- 📋 Keep XP/level as the main spine
- 📋 Expand unlockables beyond themes/audio to include:
  - Profile frames / banners / titles
  - Achievement showcase slots
  - Card styles / library presentation variants
  - Homepage layout variants
  - Recommendation pack cosmetics
- 📋 Separate reward types clearly:
  - Gameplay rewards (XP, achievements, levels)
  - Cosmetic rewards
  - Utility rewards (layout/filter presets, profile options, functional presentation unlocks)
- 📋 Keep Patreon/support boosts cosmetic or XP-focused, not direct gameplay/content bypasses

#### Key Deliverables
- Expanded reward catalog
- Profile customization options
- Layout and presentation unlocks
- Clear reward categorization

---

### Phase 5: Retention Features 📋 PLANNED
**Goal:** Create reasons to return daily/weekly/monthly.

#### Planned Tasks
- 📋 Keep permanent set of static achievements, while daily/weekly/monthly/yearly assignments rotate from larger pools
- 📋 Deepen rotating daily/weekly/monthly/yearly achievements around real play behavior
- 📋 Add "GamePilot Picks" and "Your Weekly Quest" systems:
  - System-generated from profile/recommendation data
  - User-pinned goals/collections
  - Optional weekly/monthly/yearly challenge lists
- 📋 Add Year in Review built from local data:
  - Dedicated in-app recap page
  - Exportable summary cards/images
  - Top games
  - Playtime by period
  - Mood/genre trends
  - Persona evolution
  - Achievement highlights
  - Unlocked reward milestones

#### Key Deliverables
- Enhanced rotating achievements
- Weekly quest system
- User-curated goals
- Year in Review feature
- Exportable recap cards

---

### Phase 6: Leanback / Controller Mode 📋 PLANNED
**Goal:** Make GamePilot usable from a couch/TV setup.

#### Planned Tasks
- 📋 Build as an in-app TV mode toggle that swaps to a leanback layout
- 📋 Focus on:
  - D-pad navigation
  - Large cards and focus states
  - Quick launch flows
  - Favorites/collections/recently played
  - Simplified stats and recommendation views
- 📋 Treat this as later phase once data and progression loop are stable

#### Key Deliverables
- TV mode toggle
- Controller navigation
- Leanback UI layout
- Simplified controller-friendly interfaces

---

## Additional Feature Track: Free Games Discovery 📋 PLANNED
**Goal:** Help users discover free games across supported launchers without turning GamePilot into a full store.

#### Planned Tasks
- 📋 Keep this lightweight and discovery-focused rather than building a storefront
- 📋 Show a simple "Free Games" surface for supported launchers when reliable data is available
- 📋 Start with free-to-keep promotions first, because they best match retention and urgency
- 📋 Expand later into permanently free-to-play discovery where launcher data is reliable enough
- 📋 Prioritize launcher/source adapters that expose stable public data or safe read-only integrations
- 📋 Treat as optional enrichment layered onto Home or discovery tab, not core dependency
- 📋 Store only user preferences and cached results locally when needed

#### Key Deliverables
- Free games discovery surface
- Free-to-keep promotion tracking
- Launcher integration for free game data
- Lightweight discovery features

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
4. **Better reward catalog** (Phase 4)
5. **Weekly/monthly goals + collections** (Phase 5)
6. **Year in Review** (Phase 5)
7. **Free games discovery** (Additional Track)
8. **Big-screen/controller mode** (Phase 6)

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

## Current Status: Phase 3 Starting 🚀

**Completed:** Phases 1-2 (Data Integrity + Stats Backbone)
**In Progress:** Phase 3 (Recommendation + Identity Loop)
**Next:** Phase 4 (Reward Economy Expansion)

*Last Updated: March 22, 2026*
*Version: 1.2.0*
