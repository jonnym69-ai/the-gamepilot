# Packaging manifests (winget + Scoop)

Templates live in `templates/` with `{VERSION}`, `{SHA256}`, and `{DATE}`
placeholders. `npm run packaging:manifests` fills them from `package.json` and
the built installer (default `~/gamepilot-dist/GamePilot-Setup.exe`, override
with `--installer <path>`) and writes:

- `winget/Moz.GamePilot/<version>/` — three-manifest winget package (schema 1.6.0)
- `scoop/gamepilot.json` — Scoop app manifest with `checkver`/`autoupdate`

## Submission flow (per release)

1. Build the installer (`npm run build-electron-win`), publish the GitHub release.
2. Run `npm run packaging:manifests` — regenerates both manifests.
3. Winget: `wingetcreate submit packaging/winget/Moz.GamePilot/<version>` against a microsoft/winget-pkgs fork.
4. Scoop: copy `packaging/scoop/gamepilot.json` into the `bucket/` dir of a personal Scoop bucket repo; users add it via `scoop bucket add`.
5. Re-run step 2 every release — the generated manifests here are refreshed, not hand-edited.
