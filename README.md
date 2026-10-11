# GamePilot

**Pick tonight's game in 30 seconds — and keep the record of how you actually play.**

![Perfect Play](screenshots/GamePilot%20Perfect%20Play%20Backlog%20Buster.gif)

I built this because I kept spending twenty minutes scrolling my Steam library and then closing it and watching YouTube instead.

GamePilot scans your games (Steam, Epic, GOG, Battle.net, itch, Xbox, and more), asks what mood you're in and how long you've got, and picks something from what you already own. While you play, it builds the record Steam never bothered to keep: real sessions, streaks, eras, and the games that owned you for a month at a time.

No account. No cloud. No telemetry. Windows 10/11, Linux in beta.

## Download

- **Windows:** [GamePilot-Setup.exe](https://github.com/jonnym69-ai/the-gamepilot/releases/latest) — Windows 10/11. SmartScreen will warn about the unsigned installer: **More info → Run anyway**.
- **Linux (beta):** x86_64 AppImage on the same releases page. Steam-first; works on Steam Deck in Desktop Mode — add it to Steam as a non-Steam game for Gaming Mode.
- **itch.io:** <https://moz91.itch.io/gamepilot>

## What it does

- Scans and launches games across Steam, Epic, GOG, Battle.net, Riot, itch.io, Xbox, Ubisoft, and manual installs
- Mood + time picks from your own library — with a reason attached, not a black box
- "Not this one" that doesn't punish your recommendations for having taste
- Session tracking that works offline and across launchers — real sessions, not just lifetime totals
- **Eras** — when a game takes over your life for a month, it gets named ("The Zomboid Era")
- A persona and roast built from what you actually play
- XP and achievements earned by playing, not buying
- Daily spotlight, check-in streaks, and a daily doodle
- Wishlist with price-drop alerts, and a giveaway radar for free-game dumps
- Save backups, an uninstall planner, big-screen TV mode, Discord Rich Presence

## What it isn't

- Not a storefront, not a social network, not a Steam skin
- Doesn't sell anything — there's one build and everything in it is free
- Your data is a folder of files on your PC (`%AppData%\GamePilot` / `~/.config/GamePilot`), readable and deletable
- A one-person project — expect rough edges. Bugs and requests genuinely welcome in issues or the itch comments

## Screenshots

All from the current build on Windows.

| Home | Insights & Persona |
| --- | --- |
| ![Home](screenshots/Gamepilot%20Home%20%28First%20thing%20you%20see%29.gif) | ![Insights & Persona](screenshots/Gamepilot%202nd%20thing%20you%20see%20insights%20persona.gif) |

| Library | Champions |
| --- | --- |
| ![Library](screenshots/GamePilot%20Your%20Library%20Today.gif) | ![Champions](screenshots/GamePilot%20Champions%20section.gif) |

| Wishlist | Guided tour |
| --- | --- |
| ![Wishlist](screenshots/GamePilot%20Wishlist%20Section.gif) | ![Guided tour](screenshots/GamePilot%20Welcome%20Guided%20Tour.gif) |

## Development

Electron + React (Vite). The renderer also runs standalone for UI work.

```bash
npm install
npm start                 # dev server on :3000

npm run format:check
npx eslint src --max-warnings 0
npx jest --ci             # ~770 tests
npm run build             # production renderer build

npm run build-electron-win   # packages installer to ~/gamepilot-dist/
```

## License

MIT. Read the code, verify the privacy claims, build it yourself.
