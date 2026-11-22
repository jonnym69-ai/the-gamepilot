# GamePilot — Press Kit & Platform Copy

One source of truth for how GamePilot describes itself. Copy from here for
itch.io, GitHub, Patreon, Reddit, YouTube, Product Hunt — anywhere the app is
presented. Keep the wording in sync with what the build actually does; update
this file when features ship.

## Voice

- Concrete over adjectives. "It noticed you'd been living in Zomboid for 34
  days and called it The Zomboid Era" beats "powerful analytics."
- Witty but honest. The roast is the brand. Never say "revolutionary",
  "ultimate", or "all-in-one".
- Say it once, plainly: **no account or analytics telemetry; your library,
  sessions and biography stay local.** Optional online lookups are disclosed,
  not hidden behind a blanket "offline" claim.
- The product is always **GamePilot** — no version numbers, no "app/tool"
  suffixes in titles.

## Copy blocks

### Tagline

> Your games have been recording your life. GamePilot reads it back.

### One-liner

> A local-first app that unifies your PC library, tracks how you actually
> play, and turns it into a gaming identity — eras, personas and roasts
> included.

### Short paragraph (~50 words, for itch summary / store cards / bios)

> GamePilot brings your whole PC library together — Steam, Epic, GOG, Xbox and
> more — tracks your playtime even offline, and turns your habits into a
> persona, named eras, and game-earned titles. No account or analytics
> telemetry; your library and sessions stay local. Free for Windows.

### Long paragraph (~100 words, for itch/Storefront "about")

> GamePilot watches what you actually play — not what you meant to play — and
> builds a gaming identity from it. It names your eras ("The Zomboid Era, day
> 34"), hands you titles you earned with real hours, crowns a champion every
> week, month and year, and roasts your persona so honestly you'll want to
> share it. When you can't decide what to play, it recommends from your own
> library by mood, session length and taste — and explains why. Your library,
> sessions and biography stay local, with no account or analytics telemetry.
> Optional online features send only the game names or identifiers needed for
> the request to the relevant provider.

## Feature bullets

### Free (the whole product)

- Unified library — Steam, Epic, GOG, Origin, Ubisoft, Battle.net, Rockstar,
  Xbox Game Pass, PlayStation, itch.io, local folders and emulators/ROMs
- Playtime tracking that keeps logging offline (process watcher + passive
  detection), plus imported Steam lifetime playtime kept clearly separate
- Stats dashboard — daily / weekly / monthly / yearly / all-time, playtime
  heatmaps, time-of-day patterns, habit insights
- Current era with live day counter, and signature titles earned by hours in
  specific games (Zomboid Survivor, Let Me Solo Her, plus generated
  Devotee/Legend titles)
- Adaptive persona with a roast, built from your current rotation
- Hall of Champions — weekly, monthly and yearly champions with shareable
  cards; Year in Review with Champion Journey
- Perfect Play recommendations — mood, genre and session-length picks that
  explain why; novelty/diversity controls
- XP, achievements, challenges and rewards that visibly change the app —
  layouts, card styles, theme unlocks
- Wishlist with price alerts and "what to buy next" ranked by your play
- Save backup/restore, uninstall planner, full data export (backup/CSV)
- Discord Rich Presence, Gaming Links quick-launch, big-screen mode, game
  bar overlay, themes, command palette
- Weekly digest, streaks, milestones, seasonal events

Everything above ships in the single free build — including the era archive,
year-over-year, cinematic exports, Library Reclaimer, the recommendation
tuner and the full theme collection. There is no paid tier and no feature
gating; optional support lives on itch.io (pay-what-you-want).

## Per-platform blurbs

### itch.io (storefront — conversion)

Headline: **GamePilot: Your Gaming Persona, Roasted**
Lead with the persona/era screenshot. Use the long paragraph and the feature
bullets. One build, everything free — mention pay-what-you-want as a
"support development" line only if the page supports it.

### GitHub (credibility — verification)

Same tagline, same first screenshot, then prove the promise: "audit the
source, build it yourself — MIT licensed." The README leads here already;
keep releases titled plain "GamePilot" with the headline feature first in the
notes.

### Patreon (support — not product)

Patreon is for people who want to back development: founder recognition,
Discord role, early devlogs, votes on what gets built next. Do not sell
features through it — every build ships fully unlocked.

### Reddit / social posts

Never post a feature list. Post the artifact — a screenshot of the era card
or persona roast — with a one-line story. Let the comments sell it.

## Launch video (~30 seconds)

One transformation only: **hours → identity → story.** No tour, no feature
montage, no wishlist. Record against a real library, not a fresh install.

- **0–6s — the verdict.** Persona card full screen: _"Steam tells me I spent
  150 hours in Project Zomboid. GamePilot says that makes me The Doomsday
  Prepper Who Replays Everything."_
- **6–13s — the receipts.** Zoom on the games, hours and session attributes:
  _"And it shows why — using my actual sessions, not a personality quiz."_
- **13–22s — the story.** Named era + one Chronicle chapter: _"Then it turns
  my history into named eras and a living gaming biography."_
- **22–28s — the difference.** _"No account. My sessions and biography stay
  on my PC."_
- **28–32s — the closer.** _"Your games have been recording your life.
  GamePilot reads it back."_

Success signal to listen for in comments: _"I want to see mine"_ — not
polite compliments.

## Facts (verify before publishing)

- Platforms: Windows 10/11 (64-bit); Linux x86_64 AppImage — beta, Steam-first
  (Steam Deck supported via non-Steam shortcut)
- Data: stored locally at `%APPDATA%\Roaming\GamePilot\` — never synced
- Licence: MIT (source is open; anyone can build it themselves)
- Links:
  - itch.io: <https://moz91.itch.io/gamepilot>
  - GitHub: <https://github.com/jonnym69-ai/the-gamepilot>
  - Patreon: <https://www.patreon.com/cw/GamePilot>
  - Discord: <https://discord.gg/cmpyavpXDE>
  - X: <https://x.com/Mozog91>
  - YouTube: <https://www.youtube.com/@Mozog91>
