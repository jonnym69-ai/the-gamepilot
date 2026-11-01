/**
 * Watches for installs kicked off from the "Owned, not installed" section.
 *
 * The renderer pushes a pending-install set (games whose Install button was
 * clicked) via `install-watch-set`. While the set is non-empty this module
 * polls local install markers — Steam `appmanifest_*.acf` state flags, Epic
 * `.item` manifest `bIsIncomplete`, and the GOG registry keys a game writes
 * when it installs — and emits `gamepilot:game-installed` when one lands.
 * All local reads, no network. Windows-only paths; other platforms no-op.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const POLL_MS = 20000;
const MAX_PENDING = 200;
const PENDING_TTL_MS = 48 * 60 * 60 * 1000;

// ── Pure helpers (exported under __test for unit coverage) ──────────────

const isInstalledSteamManifest = (content) => /"StateFlags"\s*"4"/.test(String(content || ''));

// Epic writes bIsIncomplete while a download is in flight; a finished
// install has the flag absent or false.
const isInstalledEpicManifest = (manifest) =>
  Boolean(manifest) && typeof manifest === 'object' && manifest.bIsIncomplete !== true;

// A GOG game registers path/exe/gameID values under its product key once
// installed. `reg query` exits non-zero when the key is absent.
const looksInstalledGogOutput = (output) => /\b(path|exe|gameID|gameid)\s+REG_SZ/i.test(String(output || ''));

const entryId = (entry) => entry?.appid || entry?.appName || entry?.gogProductId || null;

const entryKey = (entry) => (entry && entry.source && entryId(entry) ? `${entry.source}:${entryId(entry)}` : null);

const sanitizeEntry = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const source = ['steam', 'epic', 'gog'].includes(raw.source) ? raw.source : null;
  if (!source) return null;
  const entry = {
    source,
    name: typeof raw.name === 'string' ? raw.name.slice(0, 200) : '',
    image: typeof raw.image === 'string' && /^https:\/\//.test(raw.image) ? raw.image : null,
    markedAt: Number.isFinite(raw.markedAt) ? raw.markedAt : Date.now(),
  };
  if (source === 'steam') {
    const appid = String(raw.appid || '');
    if (!/^[1-9]\d{0,9}$/.test(appid) || Number(appid) > 4294967295) return null;
    entry.appid = appid;
  } else if (source === 'epic') {
    const appName = String(raw.appName || '');
    const catalogItemId = typeof raw.catalogItemId === 'string' ? raw.catalogItemId : null;
    if (!/^[A-Za-z0-9._-]{2,80}$/.test(appName)) return null;
    if (catalogItemId && !/^[A-Za-z0-9._-]{2,80}$/.test(catalogItemId)) return null;
    entry.appName = appName;
    entry.catalogItemId = catalogItemId;
  } else {
    const productId = String(raw.gogProductId || '');
    if (!/^[1-9]\d{0,14}$/.test(productId)) return null;
    entry.gogProductId = productId;
  }
  return entryKey(entry) ? entry : null;
};

// ── Local install-marker checks (Windows) ────────────────────────────────

const runCommand = (command) => {
  try {
    return execSync(command, {
      encoding: 'utf8',
      timeout: 8000,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return '';
  }
};

const getActiveDrives = () => {
  const drives = [];
  for (const letter of 'CDEFGHIJ'.split('')) {
    if (fs.existsSync(`${letter}:\\`)) drives.push(`${letter}:`);
  }
  return drives.length > 0 ? drives : ['C:'];
};

let cachedSteamAppsDirs = null;

const getSteamAppsDirs = () => {
  if (cachedSteamAppsDirs) return cachedSteamAppsDirs;
  const dirs = new Set();
  const steamPathOut = runCommand('reg query "HKCU\\SOFTWARE\\Valve\\Steam" /v SteamPath');
  const steamPath = (steamPathOut.match(/SteamPath\s+REG_SZ\s+(.+)/) || [])[1]?.trim();
  if (steamPath) dirs.add(path.join(steamPath, 'steamapps'));

  for (const drive of getActiveDrives()) {
    [
      `${drive}\\Program Files (x86)\\Steam\\steamapps`,
      `${drive}\\Program Files\\Steam\\steamapps`,
      `${drive}\\Steam\\steamapps`,
      `${drive}\\SteamLibrary\\steamapps`,
      `${drive}\\Games\\Steam\\steamapps`,
    ].forEach((candidate) => dirs.add(candidate));
  }

  // Secondary libraries registered in libraryfolders.vdf.
  for (const base of Array.from(dirs)) {
    try {
      const vdf = fs.readFileSync(path.join(base, 'libraryfolders.vdf'), 'utf8');
      for (const match of vdf.matchAll(/"path"\s+"([^"]+)"/g)) {
        const libRoot = match[1].replace(/\\\\/g, '\\');
        dirs.add(path.join(libRoot, 'steamapps'));
      }
    } catch {
      // No libraryfolders.vdf in this root — fine.
    }
  }

  cachedSteamAppsDirs = Array.from(dirs).filter((dir) => {
    try {
      return fs.existsSync(dir);
    } catch {
      return false;
    }
  });
  return cachedSteamAppsDirs;
};

const isSteamInstalled = (appid) => {
  for (const dir of getSteamAppsDirs()) {
    try {
      const manifestPath = path.join(dir, `appmanifest_${appid}.acf`);
      if (fs.existsSync(manifestPath) && isInstalledSteamManifest(fs.readFileSync(manifestPath, 'utf8'))) {
        return true;
      }
    } catch {
      // unreadable manifest — keep checking other libraries
    }
  }
  return false;
};

let cachedEpicManifestDirs = null;

const getEpicManifestDirs = () => {
  if (cachedEpicManifestDirs) return cachedEpicManifestDirs;
  const dirs = new Set([`${process.env.ProgramData || 'C:\\ProgramData'}\\Epic\\EpicGamesLauncher\\Data\\Manifests`]);
  for (const drive of getActiveDrives()) {
    dirs.add(`${drive}\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests`);
    dirs.add(`${drive}\\Epic Games\\Launcher\\Portal\\Data\\Manifests`);
    dirs.add(`${drive}\\Games\\Epic Games\\Launcher\\Portal\\Data\\Manifests`);
  }
  cachedEpicManifestDirs = Array.from(dirs).filter((dir) => fs.existsSync(dir));
  return cachedEpicManifestDirs;
};

// Read every .item manifest once per cycle into a { appName|catalogItemId ->
// installed } index so each pending Epic check is a map lookup.
const buildEpicInstalledIndex = () => {
  const index = new Map();
  for (const dir of getEpicManifestDirs()) {
    let files = [];
    try {
      files = fs.readdirSync(dir).filter((file) => file.toLowerCase().endsWith('.item'));
    } catch {
      continue;
    }
    for (const file of files) {
      try {
        const manifest = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        const installed = isInstalledEpicManifest(manifest);
        for (const id of [manifest.AppName, manifest.CatalogItemId]) {
          if (typeof id === 'string' && id && (!index.has(id) || installed)) {
            index.set(id, installed);
          }
        }
      } catch {
        // malformed manifest — skip
      }
    }
  }
  return index;
};

const isGogInstalled = (productId) => {
  const roots = [
    'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games',
    'HKLM\\SOFTWARE\\GOG.com\\Games',
    'HKCU\\SOFTWARE\\GOG.com\\Games',
  ];
  return roots.some((root) => looksInstalledGogOutput(runCommand(`reg query "${root}\\${productId}"`)));
};

// ── Watcher ──────────────────────────────────────────────────────────────

function registerIpcHandlers(ipcMain, deps) {
  const { getMainWindow } = deps || {};
  const pending = new Map();
  let timer = null;

  const emit = (entry) => {
    const win = typeof getMainWindow === 'function' ? getMainWindow() : null;
    if (win && !win.isDestroyed()) {
      win.webContents.send('gamepilot:game-installed', entry);
    }
  };

  const stopTimer = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const poll = () => {
    if (process.platform !== 'win32') {
      pending.clear();
      stopTimer();
      return;
    }
    const now = Date.now();
    const epicIndex = [...pending.values()].some((entry) => entry.source === 'epic')
      ? buildEpicInstalledIndex()
      : new Map();

    for (const [key, entry] of pending) {
      if (now - entry.markedAt > PENDING_TTL_MS) {
        pending.delete(key);
        continue;
      }
      let installed = false;
      try {
        if (entry.source === 'steam') installed = isSteamInstalled(entry.appid);
        else if (entry.source === 'epic')
          installed = Boolean(epicIndex.get(entry.appName) || epicIndex.get(entry.catalogItemId));
        else if (entry.source === 'gog') installed = isGogInstalled(entry.gogProductId);
      } catch {
        installed = false;
      }
      if (installed) {
        pending.delete(key);
        emit(entry);
      }
    }
    if (pending.size === 0) stopTimer();
  };

  const startTimer = () => {
    if (!timer) {
      timer = setInterval(poll, POLL_MS);
      if (typeof timer.unref === 'function') timer.unref();
    }
  };

  ipcMain.handle('install-watch-set', async (_event, entries) => {
    pending.clear();
    const list = Array.isArray(entries) ? entries.slice(0, MAX_PENDING) : [];
    for (const raw of list) {
      const entry = sanitizeEntry(raw);
      if (entry) pending.set(entryKey(entry), entry);
    }
    if (pending.size > 0) startTimer();
    else stopTimer();
    return { ok: true, watching: pending.size };
  });
}

module.exports = {
  registerIpcHandlers,
  __test: {
    isInstalledSteamManifest,
    isInstalledEpicManifest,
    looksInstalledGogOutput,
    sanitizeEntry,
    entryKey,
    PENDING_TTL_MS,
  },
};
