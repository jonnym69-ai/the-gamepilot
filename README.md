# GamePilot

## Your games. Your habits. Your gaming story

**Copyright © 2026 Moz** | **MIT License** | **Local-first · Private · Open source**

GamePilot is a local-first desktop app that unifies your game library across every launcher, tracks your playtime (even offline), protects your save files, and turns your collection into a private, gamified dashboard — without accounts, cloud sync, or telemetry of any kind.

---

## Why GamePilot

**🔓 Open source — verify, don't trust.**
Most launchers ask you to trust them with your data. GamePilot lets you read every line before you install.

**🔒 100% local & private.**
No accounts, no cloud, no telemetry. Your library and stats never leave your machine.

**🛰️ Tracks even when Steam can't.**
GamePilot watches the game process itself, so your playtime keeps logging fully offline — perfect for laptops and travel.

**📊 Year in Review, every day.**
Playtime, longest sessions, busiest days, and top games — always on, not a once-a-year recap.

**⚔️ Your library, leveled up.**
A gaming identity that learns your habits, recommendations that explain *why*, and XP / achievements / rewards that make your backlog fun.

---

## Screenshots

> All screenshots are from v1.9.0 on Windows.

### Welcome Guided Tour

![Welcome Guided Tour](screenshots/GamePilot%20Welcome%20Guided%20Tour.gif)

### Home — First thing you see

![Home](screenshots/Gamepilot%20Home%20%28First%20thing%20you%20see%29.gif)

### Insights & Persona

![Insights & Persona](screenshots/Gamepilot%202nd%20thing%20you%20see%20insights%20persona.gif)

### Library Today

![Library Today](screenshots/GamePilot%20Your%20Library%20Today.gif)

### Champions

![Champions](screenshots/GamePilot%20Champions%20section.gif)

### Perfect Play & Backlog Buster

![Perfect Play](screenshots/GamePilot%20Perfect%20Play%20Backlog%20Buster.gif)

### Wishlist

![Wishlist](screenshots/GamePilot%20Wishlist%20Section.gif)

---

## Features

### 📚 Library Management

- Scan and import games from Steam, Epic Games, GOG, Origin, Ubisoft Connect, Battle.net, Rockstar Games, Xbox Game Pass, and PlayStation
- Track playtime, completion status, and personal ratings
- Organize games by mood, genre, and platform
- Export library data in multiple formats

### 📊 Stats & Year in Review

- Always-available playtime dashboard (daily / weekly / monthly / yearly / all time)
- Imports your real Steam lifetime playtime, clearly separated from GamePilot-tracked sessions
- Switchable hours / days display for huge playtime totals
- Deeper play habits: longest session, busiest day, late-night & weekend runs

### 🎯 Smart Recommendations (Perfect Play)

- Recommendations based on mood, genre, and available playtime
- Explains *why* each game was picked
- Tunable novelty, diversity, and exploration controls
- Pro adds a detailed recommendation scoring-weight editor

### ⚔️ Gaming Identity & Progression

- Adaptive persona driven by recent play — not stale lifetime favourites
- Hall of Champions: weekly, monthly, and yearly champions from tracked sessions
- **Eras**: when one game takes over your play, GamePilot names it — "The Zomboid Era", day counter and all
- **Signature titles**: game-earned profile titles unlocked by real hours — "Zomboid Survivor", "Let Me Solo Her", "The Factory Must Grow" — plus generated Devotee/Legend titles for any game you sink 50h+/150h+ into
- XP, achievements, challenges, and rewards layered over your backlog
- Rewards that actually change the app: Home layouts, library variants, card styles, logo animations, recommendation packs, Gaming Links effects, and more

### 💾 Saves, Storage & Maintenance

- Save location detection and manual backup/restore with typed-confirmation safety
- Library Reclaimer (Pro): compare disk usage and last-played dates across installed games
- Uninstall planner with save-preservation awareness
- Emulator/ROM support for non-storefront games

### 💰 Wishlist & Deals

- Track games you're considering with price watching and drop alerts
- "What to buy next" suggestions ranked by your actual play patterns
- Similar-game discovery on the full Wishlist page

### 🎮 Game Compatibility & Performance

- 770+ game database with detailed system requirements
- Real-time compatibility checking and estimated FPS against your hardware
- Performance Cockpit: bottleneck detection and upgrade recommendations

### � Library Valuation

- Calculate total library value with multi-currency support
- Real-time price conversion from Steam pricing

### 🎮 Retention & Engagement

- Year in Review with Champion Journey and visual annual story
- Weekly digest cards, milestone toasts, and smart nudge reminders
- Daily doodle, streak badges, and nostalgia cards
- Seasonal events and hide-and-seek rewards
- Discord Rich Presence — share what you're playing
- Gaming Links: a customizable quick-launch panel for stores, tools, and communities
- Guided tour for new users

### Customization

- Multiple themes, dark/light mode, big-screen (TV) mode, and flexible layouts
- Home layout reward variants with distinct visual styling per layout
- Energy Vibe Picker for mood-based game discovery
- Command palette (press `/` anywhere to search games and pages)

## GamePilot and GamePilot Pro

Two editions are built from the same codebase. The Free/Pro split is in development; the paid storefront is not open yet.

**GamePilot — Free to keep using.** Library management, launching, tracking, recommendations, current eras, game-earned titles, XP and rewards, wishlist alerts, basic sharing, Discord presence, and manual save backup/restore stay free. Year in Review, habits, Performance Cockpit, existing themes, and Big Screen Mode also remain free in the current split. Personal-data exports and restoration are never edition-gated.

**GamePilot Pro — More control and richer visual exports.** Includes everything in Free, plus:

- Cinematic exports: poster, square-card and wide-banner formats with background controls.
- Library Reclaimer: compare installed sizes and last-played dates to decide what to remove.
- Advanced recommendation tuner: edit detailed scoring weights, beyond the normal Free recommendation controls.

Pro is planned as a separate one-time paid download, not an in-app license-key unlock. There are no activation requests or online edition checks. Price, included updates, paid-download delivery and complimentary early-user claims must be finalised before sales open. Existing supporter recognition remains separate from the edition.

Both installers retain the `GamePilot` application identity, local-data folder and runtime renderer path. They replace one another rather than install side by side. Back up your data, close GamePilot and use the same installation location when changing editions. Saved data and recommendation preferences are retained; Free does not expose the advanced weight editor. A real Free → Pro → Free installer smoke test is still required before publishing these builds.

## Installation

### Windows

1. Download the latest `GamePilot Setup` installer from the [releases page](https://github.com/jonnym69-ai/the-gamepilot/releases)
2. Run the installer
3. Follow the installation wizard
4. Launch GamePilot from your Start Menu

### Linux / Steam Deck beta

Linux support is Steam-first and remains a beta until it has been validated on physical handheld hardware. Download the x86_64 AppImage, mark it executable, and launch it from Desktop Mode. Steam Deck users can then add the AppImage to Steam as a non-Steam game for Gaming Mode.

```bash
chmod +x GamePilot-*.AppImage
./GamePilot-*.AppImage
```

The beta supports Steam library discovery and Steam protocol launching. Windows-only launchers and platform tools are intentionally unavailable on Linux.

### Development Setup

```bash
npm install
npm start
```

### Building

Renderer builds:

```bash
npm run build:free
npm run build:pro
```

Free outputs to `dist/renderer/`; Pro outputs to `dist/renderer-pro/`. Development defaults to Free (`npm start`); `npm run start:pro` previews Pro.

Windows installers:

```bash
npm run build-electron-win-free
npm run build-electron-win-pro
```

`npm run build-electron-win` remains an alias for packaging Free. Each command rebuilds the correct renderer before packaging and checks its edition/version marker. Windows outputs are separated outside the repository to avoid the previous in-tree packaging lock:

- Free: `~/gamepilot-dist/free/GamePilot-Free-Setup-<version>.exe`
- Pro: `~/gamepilot-dist/pro/GamePilot-Pro-Setup-<version>.exe`

On Windows, `~` means your user directory. Keep dev servers closed before packaging. These commands do not publish anything. Distribute Pro installers through the paid storefront once it is configured; do not upload them to the public Free release feed.

For other platforms use `npm run build-electron-linux` / `npm run build-electron-linux-pro`, or `npm run build-electron-mac` / `npm run build-electron-mac-pro`. Outputs use the same edition-specific directories. Linux AppImage packaging requires a Linux host; the included Ubuntu workflow continues to build only Free.

## Usage

### Scanning Your Library

1. Open GamePilot
2. Click "Scan Library" to detect games from all installed platforms
3. Wait for the scan to complete
4. Your library will be automatically saved

### Checking Game Compatibility

1. Click on any game in your library
2. View the "System Compatibility" section
3. See minimum, recommended, and ultra requirements
4. Check estimated FPS for your system

### Performance Analysis

1. Navigate to the Performance Cockpit
2. View your system specifications and scores
3. Check bottleneck analysis
4. Review upgrade recommendations with costs

### Getting Recommendations

1. Go to Perfect Play Selector
2. Select your mood and preferred genres
3. Choose available playtime
4. Get personalized recommendations

## License & Privacy

### License

GamePilot is open source under the MIT License. See [LICENSE](LICENSE) for full details.

**What this means:**
- You may use, study, modify, copy, distribute and sell copies of the software.
- Copies or substantial portions must retain the copyright and permission notice.
- The software is provided without warranty, as described in `LICENSE`.

Selling official Pro builds does not remove these MIT permissions or make the source view-only. Customers are paying for the convenience of the official build and supporting development.

### Privacy Policy

**Summary:**
- ✅ Zero data collection
- ✅ Local-only operation
- ✅ No cloud storage
- ✅ No telemetry or tracking
- ✅ Your data, your control

### Source Code

The source code in this repository is available under the MIT License, including its modification and redistribution permissions. You can study the implementation, verify the privacy behaviour, and build either edition yourself using the commands above.

For running GamePilot, please download the installer from the main downloads section.

## System Requirements

### Minimum

- Windows 10 or later, or a modern x86_64 Linux distribution for the beta
- 4GB RAM
- 500MB free disk space
- Intel i5, AMD equivalent, or Steam Deck

### Recommended

- Windows 11 or current SteamOS
- 8GB+ RAM
- SSD with 1GB free space
- Intel i7, AMD Ryzen 7, or equivalent

## Data Storage

All GamePilot data is stored locally on your computer:

```text
Windows: C:\Users\[YourUsername]\AppData\Roaming\GamePilot\
Linux:   ~/.config/GamePilot/
```

You can:
- Backup your data manually
- Export your library at any time
- Delete all data by removing the folder
- Access raw data files directly

## Troubleshooting

### Library Scan Not Finding Games

- Ensure Steam/Epic/GOG are installed in standard locations
- Check that game folders have proper permissions
- Try running GamePilot as Administrator

### Compatibility Showing "Unknown"

- Game may not be in the 770+ game database
- System will estimate compatibility based on your hardware
- Check Game Modal for detailed analysis

### Performance Page Not Updating

- Refresh the page or restart GamePilot
- Ensure library has been scanned
- Check that system info was detected correctly

## Support & Contact

For issues, questions, or suggestions, contact the author directly.

## Changelog

### Unreleased

- ✅ Signature titles — profile titles earned by hours in specific games (Zomboid Survivor, Let Me Solo Her, The Factory Must Grow…), plus generated Devotee/Legend titles for any game past 50h/150h
- ✅ Eras — when one game dominates your recent play, your current era is named after it with a live day counter
- ✅ Rewards overhaul — every reward category now visibly changes its target page: Home layouts reorder the real page, recommendation packs restyle Recs, Gaming Links features/icons/layouts all work
- ✅ Wishlist redesign — styled two-column card grid on Home and the Wishlist page
- ✅ Visual refresh — branded navigation, split Home hero, quieter surfaces, better responsive behaviour

### v1.9.0

- ✅ Recent-play gaming personas — adaptive identity driven by tracked sessions, not stale lifetime favourites
- ✅ Hall of Champions — weekly, monthly, and yearly champions with portrait-led history and shareable cards
- ✅ Expanded Year in Review with Champion Journey and annual champion boards
- ✅ Smarter recommendations — "Because you played" shelf, rotation-aware scoring, richer explanations
- ✅ Achievement overhaul — curated attainable achievements, rarity, category filters, sorting
- ✅ Home layout rewards — 5 visually distinct layouts (Mission Control, Focus Finder, Dashboard Split, Streamer Overlay, Arcade Cabinet)
- ✅ Engagement widgets — weekly digest, milestone toasts, smart nudge reminders, nostalgia cards
- ✅ Seasonal events and hide-and-seek rewards
- ✅ Discord Rich Presence support
- ✅ Passive game watcher for background session tracking
- ✅ Session database split for robust local persistence
- ✅ Linux / Steam Deck beta with Steam library discovery and Proton-aware launching
- ✅ Library and interface cleanup — consolidated pages, portrait artwork, streamlined navigation

### v1.8.0

- ✅ Expanded persona roasts with new archetypes and hybrid labels
- ✅ Shareable champion and story cards
- ✅ Session hardening with stale-session pruning
- ✅ UI cleanup and polish across Home, Profile, and Stats

### v1.7.0

- ✅ Gaming identity now grounded in real play data — dominant genre, game count, hours played, and top games
- ✅ Home page Habit Insights shows taste clusters (Souls-like, Roguelike, Platformer, etc.) based on signature games
- ✅ Insights mood display now shows top 3 moods with accurate "sessions" labelling
- ✅ Removed duplicate smart shelves (Discovery, Weekend Ready) for cleaner home page
- ✅ Audio reward catalog and bundled audio assets removed to reduce install size
- ✅ Core recommendation path decoupled from heavy hardware database
- ✅ Secondary and Labs routes lazy-loaded for faster startup

### v1.5.0

- ✅ Fixed Steam playtime import in packaged builds (resilient scanner loading)
- ✅ Imported Steam lifetime playtime now surfaced on the All Time view, separate from tracked sessions
- ✅ Most Played Games can switch between GamePilot-tracked and Steam-imported rankings
- ✅ Hours / days display toggle for large playtime totals
- ✅ Clearer "Tracked by GamePilot" vs "Steam Lifetime" labelling

### v1.4.0

- ✅ Enhanced Year in Review with deeper stats (longest session, busiest day, repeat games)
- ✅ Added period-aware deeper insights to Stats page
- ✅ Fixed Epic mystery games in Free Games Radar
- ✅ Improved local-first session aggregation
- ✅ Source code available for viewing

### v1.1.0 (March 14, 2026)

- ✅ Added 770+ game compatibility database
- ✅ Integrated real-time compatibility badges
- ✅ Added detailed system requirements modal
- ✅ Implemented Performance Cockpit analysis
- ✅ Added multi-currency support for upgrade costs
- ✅ Improved GPU scoring accuracy
- ✅ User-friendly compatibility labels

### v1.0.0 (Previous)

- Initial release with library management and basic features

---

**GamePilot is your personal gaming companion. Enjoy!** 🎮
