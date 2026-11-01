/**
 * Storage cleaner — finds reclaimable disk space that is provably orphaned:
 *
 *   (a) Steam shader caches for games that are no longer installed. For every
 *       steamapps directory (registry paths, drive probing and
 *       libraryfolders.vdf — same discovery as the library scanner), a
 *       `shadercache/<appid>` directory counts as orphaned only when no
 *       `appmanifest_<appid>.acf` exists in ANY discovered steamapps dir.
 *       Only numeric appid directories are considered; appid 228980 (Steamworks
 *       Common Redistributables) is always kept — its cache is shared.
 *
 *   (b) Windows crash dumps under %LOCALAPPDATA%\CrashDumps (*.dmp files).
 *       Windows only; other platforms return none.
 *
 * Safety contract:
 *   - `storage-cleaner-scan` returns items; `storage-cleaner-clean` takes ids
 *     ONLY (never renderer-supplied paths) and re-runs the scan to rebuild the
 *     allowlist before touching anything.
 *   - Matched paths are moved to the Recycle Bin via shell.trashItem — nothing
 *     is permanently deleted.
 *   - Symlinks/junctions are never followed: candidates are lstat'd and must
 *     resolve to a path still directly inside the expected parent directory.
 *   - Per-item failures (locked files, permission errors, vanished paths) are
 *     reported in the result, never thrown for the batch.
 */
const fs = require('fs');
const path = require('path');
const { walkFolderSize } = require('./saveManager');

let electronShell = null;
try {
  // `electron` resolves to a path string outside of Electron — treat any
  // import failure (or non-Electron require) as "no shell available".
  const electron = require('electron');
  if (electron && typeof electron === 'object' && electron.shell) {
    electronShell = electron.shell;
  }
} catch {
  electronShell = null;
}

// Steamworks Common Redistributables — its shader cache is shared across the
// whole library, not orphaned content.
const EXCLUDED_SHADER_APPIDS = new Set(['228980']);

const isNumericAppId = (name) => /^\d+$/.test(name);

const hashPath = (value) => {
  const input = String(value || '');
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
};

const isPathInside = (childPath, parentPath) => {
  const normalizedChild = path.resolve(childPath || '');
  const normalizedParent = path.resolve(parentPath || '');
  const relative = path.relative(normalizedParent, normalizedChild);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
};

const safeListDir = async (dir) => {
  try {
    return await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};

/**
 * All installed Steam appids across every discovered steamapps dir, plus a
 * best-effort appid → name map parsed from the manifests.
 */
const collectInstalledSteamApps = async (steamAppsDirs) => {
  const installedAppIds = new Set();
  const appNames = new Map();

  for (const dir of steamAppsDirs) {
    const entries = await safeListDir(dir);
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const match = /^appmanifest_(\d+)\.acf$/.exec(entry.name);
      if (!match) continue;
      installedAppIds.add(match[1]);
      if (!appNames.has(match[1])) {
        try {
          const content = await fs.promises.readFile(path.join(dir, entry.name), 'utf8');
          const nameMatch = /"name"\s+"([^"]+)"/.exec(content);
          if (nameMatch) appNames.set(match[1], nameMatch[1]);
        } catch {
          // manifest vanished mid-scan — name just stays unresolved
        }
      }
    }
  }

  return { installedAppIds, appNames };
};

/**
 * Orphaned `shadercache/<appid>` dirs — the appid has no appmanifest in any
 * discovered steamapps dir. Returns [{appid, path}].
 */
const findOrphanedShaderCaches = async (steamAppsDirs) => {
  const safeDirs = (Array.isArray(steamAppsDirs) ? steamAppsDirs : []).filter(Boolean);
  const { installedAppIds, appNames } = await collectInstalledSteamApps(safeDirs);
  const orphans = [];

  for (const dir of safeDirs) {
    const shaderRoot = path.join(dir, 'shadercache');
    const entries = await safeListDir(shaderRoot);
    for (const entry of entries) {
      // Dirent.isDirectory() is false for symlinks/junctions — never follow them.
      if (!entry.isDirectory()) continue;
      if (!isNumericAppId(entry.name)) continue;
      if (EXCLUDED_SHADER_APPIDS.has(entry.name)) continue;
      if (installedAppIds.has(entry.name)) continue;

      const fullPath = path.join(shaderRoot, entry.name);
      try {
        const stat = await fs.promises.lstat(fullPath);
        if (stat.isSymbolicLink() || !stat.isDirectory()) continue;
      } catch {
        continue; // vanished or inaccessible
      }
      // Paranoia: refuse anything not literally inside this shadercache dir.
      if (!isPathInside(fullPath, shaderRoot)) continue;

      orphans.push({
        appid: entry.name,
        path: fullPath,
        label: appNames.get(entry.name) || `Steam app ${entry.name} (uninstalled)`,
      });
    }
  }

  return orphans;
};

/**
 * *.dmp files directly inside the crash-dumps dir (Windows only).
 */
const findCrashDumps = async (crashDumpsDir) => {
  if (!crashDumpsDir) return [];
  const entries = await safeListDir(crashDumpsDir);
  const dumps = [];

  for (const entry of entries) {
    // Skip symlinks/junctions — only real files are candidates.
    if (entry.isSymbolicLink && entry.isSymbolicLink()) continue;
    if (!entry.isFile()) continue;
    if (!entry.name.toLowerCase().endsWith('.dmp')) continue;

    const fullPath = path.join(crashDumpsDir, entry.name);
    if (!isPathInside(fullPath, crashDumpsDir)) continue;

    dumps.push({ name: entry.name, path: fullPath });
  }

  return dumps;
};

/**
 * Full scan. `options.steamAppsDirs` and `options.crashDumpsDir` are injectable
 * for tests; callers in production omit them and use system discovery.
 * `options.platform` defaults to process.platform — crash dumps only scan
 * on win32.
 */
const scanForItems = async (options = {}) => {
  const platform = options.platform || process.platform;
  const items = [];

  const steamAppsDirs =
    options.steamAppsDirs ||
    (typeof options.getSteamInstallPaths === 'function' ? options.getSteamInstallPaths() : []);
  const orphans = await findOrphanedShaderCaches(steamAppsDirs);
  for (const orphan of orphans) {
    const size = await walkFolderSize(orphan.path).catch(() => ({ bytes: 0 }));
    items.push({
      id: `steam-shader-orphan:${orphan.appid}:${hashPath(orphan.path)}`,
      kind: 'steam-shader-orphan',
      label: orphan.label,
      path: orphan.path,
      bytes: size.bytes || 0,
    });
  }

  if (platform === 'win32') {
    const crashDumpsDir =
      options.crashDumpsDir ||
      (options.localAppData ? path.join(options.localAppData, 'CrashDumps') : null) ||
      (process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'CrashDumps') : null);
    const dumps = await findCrashDumps(crashDumpsDir);
    for (const dump of dumps) {
      let bytes = 0;
      try {
        const stat = await fs.promises.lstat(dump.path);
        if (stat.isSymbolicLink() || !stat.isFile()) continue;
        bytes = stat.size;
      } catch {
        continue; // vanished mid-scan
      }
      items.push({
        id: `crash-dump:${dump.name}`,
        kind: 'crash-dump',
        label: `Crash dump — ${dump.name}`,
        path: dump.path,
        bytes,
      });
    }
  }

  return items;
};

/**
 * Trash the matched items. `ids` comes from the renderer; the allowlist is a
 * FRESH scan — a renderer-supplied path is never accepted, and ids not present
 * in the new scan are rejected (the item may have been resolved already).
 */
const cleanItems = async (ids, items, deps = {}) => {
  const requestedIds = Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : [];
  const byId = new Map((Array.isArray(items) ? items : []).map((item) => [item.id, item]));
  const trashItem = deps.trashItem || (electronShell && electronShell.trashItem && electronShell.trashItem.bind(electronShell));

  const results = [];
  for (const id of requestedIds) {
    const item = byId.get(id);
    if (!item) {
      results.push({ id, ok: false, error: 'not-in-scan' });
      continue;
    }
    if (!trashItem) {
      results.push({ id, ok: false, error: 'trash-unavailable' });
      continue;
    }
    try {
      // Re-validate at trash time: still real, still not a link, still inside
      // the parent the scan produced it from.
      const stat = await fs.promises.lstat(item.path);
      if (stat.isSymbolicLink()) {
        results.push({ id, ok: false, error: 'is-symlink' });
        continue;
      }
      const parent = path.dirname(item.path);
      if (!isPathInside(item.path, parent)) {
        results.push({ id, ok: false, error: 'outside-root' });
        continue;
      }
      await trashItem(item.path);
      results.push({ id, ok: true });
    } catch (err) {
      results.push({ id, ok: false, error: err?.message || 'trash-failed' });
    }
  }
  return results;
};

function registerIpcHandlers(ipcMain, deps = {}) {
  const getSteamInstallPaths =
    deps.getSteamInstallPaths ||
    (() => {
      try {
        return require('../src/services/scanner/steamScanner').getSteamInstallPaths;
      } catch {
        return null;
      }
    })();
  const localAppData = deps.localAppData || null;
  const platform = deps.platform || process.platform;

  ipcMain.handle('storage-cleaner-scan', async () => {
    try {
      const items = await scanForItems({
        getSteamInstallPaths,
        localAppData,
        platform,
      });
      return {
        ok: true,
        items,
        totalBytes: items.reduce((sum, item) => sum + (item.bytes || 0), 0),
      };
    } catch (err) {
      return { ok: false, error: err?.message || 'scan-failed', items: [], totalBytes: 0 };
    }
  });

  ipcMain.handle('storage-cleaner-clean', async (_event, payload = {}) => {
    const ids = Array.isArray(payload?.ids) ? payload.ids : [];
    if (ids.length === 0) {
      return { ok: true, results: [] };
    }
    try {
      const items = await scanForItems({
        getSteamInstallPaths,
        localAppData,
        platform,
      });
      const results = await cleanItems(ids, items, { trashItem: deps.trashItem });
      return { ok: true, results };
    } catch (err) {
      return { ok: false, error: err?.message || 'clean-failed', results: [] };
    }
  });
}

module.exports = {
  registerIpcHandlers,
  findOrphanedShaderCaches,
  findCrashDumps,
  scanForItems,
  cleanItems,
};
