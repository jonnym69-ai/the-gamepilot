const { app, shell, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { execFile: childExecFile } = require('child_process');

const MAX_DISK_WALK_DEPTH = 16;
const MAX_DISK_WALK_FILES = 250_000;
const MAX_DISK_WALK_MS = 45_000;
const MAX_SAVE_BACKUP_DEPTH = 32;
const MAX_SAVE_BACKUP_FILES = 100_000;
const MAX_SAVE_BACKUP_MS = 120_000;

async function walkFolderSize(rootPath) {
  const startedAt = Date.now();
  let bytes = 0;
  let files = 0;
  let dirs = 0;
  let truncated = false;
  const seenInodes = new Set(); // Defence against hardlink double-counting on NTFS

  const visit = async (dir, depth) => {
    if (truncated) return;
    if (depth > MAX_DISK_WALK_DEPTH) {
      truncated = true;
      return;
    }
    if (Date.now() - startedAt > MAX_DISK_WALK_MS) {
      truncated = true;
      return;
    }
    if (files > MAX_DISK_WALK_FILES) {
      truncated = true;
      return;
    }

    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return; // permission denied / vanished folder — silently skip
    }
    dirs += 1;

    for (const entry of entries) {
      if (truncated) return;
      // Skip symlinks/junctions: prevents loops and avoids counting
      // cross-library shared content twice.
      if (entry.isSymbolicLink && entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(full, depth + 1);
      } else if (entry.isFile()) {
        try {
          const stat = await fs.promises.lstat(full);
          if (stat.isSymbolicLink()) continue;
          // Hardlink dedupe: only count first occurrence.
          if (stat.nlink && stat.nlink > 1) {
            const key = `${stat.dev}:${stat.ino}`;
            if (seenInodes.has(key)) continue;
            seenInodes.add(key);
          }
          bytes += stat.size;
          files += 1;
        } catch {
          // file vanished or no access — skip
        }
      }
    }
  };

  await visit(rootPath, 0);
  return { bytes, files, dirs, truncated, durationMs: Date.now() - startedAt };
}

const resolveSaveLocationPath = (rawPath, game = {}) => {
  let value = String(rawPath || '').trim();
  if (!value) return { resolvedPath: '', unresolvedTokens: [] };

  const envMap = {
    USERPROFILE: process.env.USERPROFILE || app.getPath('home'),
    APPDATA: process.env.APPDATA || path.join(app.getPath('home'), 'AppData', 'Roaming'),
    LOCALAPPDATA: process.env.LOCALAPPDATA || path.join(app.getPath('home'), 'AppData', 'Local'),
    PROGRAMDATA: process.env.PROGRAMDATA || 'C:\\ProgramData',
    PUBLIC: process.env.PUBLIC || 'C:\\Users\\Public',
    DOCUMENTS: app.getPath('documents'),
    SAVEDGAMES: path.join(app.getPath('home'), 'Saved Games'),
  };

  Object.entries(envMap).forEach(([token, replacement]) => {
    value = value.replace(new RegExp(`%${token}%`, 'gi'), replacement);
  });

  value = value
    .replace(/<user-profile>/gi, envMap.USERPROFILE)
    .replace(/<userprofile>/gi, envMap.USERPROFILE)
    .replace(/<documents>/gi, envMap.DOCUMENTS)
    .replace(/<saved-games>/gi, envMap.SAVEDGAMES)
    .replace(/<savedgames>/gi, envMap.SAVEDGAMES)
    .replace(/<path-to-game>/gi, game.installDir || game.path || '')
    .replace(/<game-folder>/gi, game.installDir || game.path || '')
    .replace(/^~(?=\\|\/)/, envMap.USERPROFILE)
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  const unresolvedTokens = Array.from(new Set(value.match(/<[^>]+>/g) || []));
  return {
    resolvedPath: path.normalize(value),
    unresolvedTokens,
  };
};

const getSaveLocationStatus = async (candidate = {}, game = {}) => {
  const rawPath = candidate.path || candidate.rawPath || '';
  const resolved = resolveSaveLocationPath(rawPath, game);
  const base = {
    ...candidate,
    rawPath,
    resolvedPath: resolved.resolvedPath,
    unresolvedTokens: resolved.unresolvedTokens,
    exists: false,
    isDirectory: false,
    isFile: false,
    canOpen: false,
    bytes: 0,
    files: 0,
    dirs: 0,
    truncated: false,
  };

  if (!resolved.resolvedPath || resolved.unresolvedTokens.length > 0) {
    return { ...base, error: resolved.unresolvedTokens.length > 0 ? 'unresolved-tokens' : 'invalid-path' };
  }

  try {
    const stat = await fs.promises.stat(resolved.resolvedPath);
    if (stat.isDirectory()) {
      const size = await walkFolderSize(resolved.resolvedPath);
      return { ...base, exists: true, isDirectory: true, canOpen: true, ...size };
    }
    if (stat.isFile()) {
      return { ...base, exists: true, isFile: true, canOpen: true, bytes: stat.size, files: 1 };
    }
    return { ...base, exists: true, canOpen: true };
  } catch (err) {
    return { ...base, error: 'not-found' };
  }
};

const sanitizeBackupSegment = (value, fallback = 'backup') => {
  const cleaned = String(value || '')
    .replace(/[<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return cleaned || fallback;
};

const copySavePath = async (sourcePath, destinationPath, summary, depth = 0, startedAt = Date.now()) => {
  if (summary.truncated) return;
  if (depth > MAX_SAVE_BACKUP_DEPTH) {
    summary.truncated = true;
    return;
  }
  if (Date.now() - startedAt > MAX_SAVE_BACKUP_MS) {
    summary.truncated = true;
    return;
  }
  if (summary.files >= MAX_SAVE_BACKUP_FILES) {
    summary.truncated = true;
    return;
  }

  const stat = await fs.promises.lstat(sourcePath);
  if (stat.isSymbolicLink()) return;

  if (stat.isDirectory()) {
    await fs.promises.mkdir(destinationPath, { recursive: true });
    summary.dirs += 1;
    const entries = await fs.promises.readdir(sourcePath, { withFileTypes: true });
    for (const entry of entries) {
      if (summary.truncated) return;
      if (entry.isSymbolicLink && entry.isSymbolicLink()) continue;
      await copySavePath(
        path.join(sourcePath, entry.name),
        path.join(destinationPath, entry.name),
        summary,
        depth + 1,
        startedAt
      );
    }
    return;
  }

  if (stat.isFile()) {
    await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.promises.copyFile(sourcePath, destinationPath, fs.constants.COPYFILE_EXCL);
    summary.files += 1;
    summary.bytes += stat.size;
  }
};

const getBackupPathSummary = async (targetPath) => {
  const base = {
    path: targetPath,
    exists: false,
    isDirectory: false,
    isFile: false,
    bytes: 0,
    files: 0,
    dirs: 0,
    truncated: false,
  };

  try {
    const stat = await fs.promises.stat(targetPath);
    if (stat.isDirectory()) {
      const size = await walkFolderSize(targetPath);
      return { ...base, exists: true, isDirectory: true, ...size };
    }
    if (stat.isFile()) {
      return { ...base, exists: true, isFile: true, bytes: stat.size, files: 1 };
    }
    return { ...base, exists: true };
  } catch (err) {
    return { ...base, error: 'not-found' };
  }
};

const isPathInside = (childPath, parentPath) => {
  const normalizedChild = path.resolve(childPath || '');
  const normalizedParent = path.resolve(parentPath || '');
  const relative = path.relative(normalizedParent, normalizedChild);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
};

const copyRestorePath = async (sourcePath, destinationPath, summary, depth = 0, startedAt = Date.now()) => {
  if (summary.truncated) return;
  if (depth > MAX_SAVE_BACKUP_DEPTH) {
    summary.truncated = true;
    return;
  }
  if (Date.now() - startedAt > MAX_SAVE_BACKUP_MS) {
    summary.truncated = true;
    return;
  }
  if (summary.files >= MAX_SAVE_BACKUP_FILES) {
    summary.truncated = true;
    return;
  }

  const stat = await fs.promises.lstat(sourcePath);
  if (stat.isSymbolicLink()) return;

  if (stat.isDirectory()) {
    await fs.promises.mkdir(destinationPath, { recursive: true });
    summary.dirs += 1;
    const entries = await fs.promises.readdir(sourcePath, { withFileTypes: true });
    for (const entry of entries) {
      if (summary.truncated) return;
      if (entry.isSymbolicLink && entry.isSymbolicLink()) continue;
      await copyRestorePath(
        path.join(sourcePath, entry.name),
        path.join(destinationPath, entry.name),
        summary,
        depth + 1,
        startedAt
      );
    }
    return;
  }

  if (stat.isFile()) {
    await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.promises.copyFile(sourcePath, destinationPath);
    summary.files += 1;
    summary.bytes += stat.size;
  }
};

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('save-location-status', async (_event, payload = {}) => {
    const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
    const game = payload?.game || {};
    try {
      const locations = [];
      for (const candidate of candidates.slice(0, 10)) {
        locations.push(await getSaveLocationStatus(candidate, game));
      }
      return { ok: true, locations };
    } catch (err) {
      return { ok: false, error: err.message || 'save-location-status-failed', locations: [] };
    }
  });

  ipcMain.handle('open-save-location', async (_event, payload = {}) => {
    const rawPath = payload?.path || payload?.rawPath || '';
    const game = payload?.game || {};
    const resolved = resolveSaveLocationPath(rawPath, game);
    if (!resolved.resolvedPath || resolved.unresolvedTokens.length > 0) {
      return {
        ok: false,
        error: 'unresolved-path',
        resolvedPath: resolved.resolvedPath,
        unresolvedTokens: resolved.unresolvedTokens,
      };
    }
    try {
      const result = await shell.openPath(resolved.resolvedPath);
      return result
        ? { ok: false, error: result, resolvedPath: resolved.resolvedPath }
        : { ok: true, resolvedPath: resolved.resolvedPath };
    } catch (err) {
      return { ok: false, error: err.message || 'open-save-location-failed', resolvedPath: resolved.resolvedPath };
    }
  });

  ipcMain.handle('choose-save-backup-destination', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Choose GamePilot save backup folder',
        properties: ['openDirectory', 'createDirectory'],
      });
      if (result.canceled || !result.filePaths?.[0]) {
        return { ok: false, canceled: true };
      }
      return { ok: true, path: result.filePaths[0] };
    } catch (err) {
      return { ok: false, error: err.message || 'choose-destination-failed' };
    }
  });

  ipcMain.handle('create-save-backup', async (_event, payload = {}) => {
    const game = payload?.game || {};
    const destinationRoot = String(payload?.destinationRoot || '').trim();
    const requestedLocations = Array.isArray(payload?.locations) ? payload.locations : [];
    if (!destinationRoot) return { ok: false, error: 'missing-destination' };
    if (requestedLocations.length === 0) return { ok: false, error: 'missing-locations' };

    try {
      const destinationStat = await fs.promises.stat(destinationRoot);
      if (!destinationStat.isDirectory()) return { ok: false, error: 'destination-not-folder' };

      const validLocations = [];
      for (const location of requestedLocations.slice(0, 10)) {
        const status = await getSaveLocationStatus(
          { ...location, path: location.resolvedPath || location.rawPath || location.path },
          game
        );
        if (status.exists && status.canOpen && status.resolvedPath) {
          validLocations.push(status);
        }
      }

      if (validLocations.length === 0) {
        return { ok: false, error: 'no-existing-locations' };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const gameName = sanitizeBackupSegment(game.name || game.title || 'Unknown Game', 'Unknown Game');
      const backupRoot = path.join(destinationRoot, 'GamePilot Save Backups', `${gameName} - ${timestamp}`);
      const normalizedBackupRoot = path.normalize(backupRoot).toLowerCase();
      const unsafeSource = validLocations.find((location) => {
        const sourcePath = path.normalize(location.resolvedPath).toLowerCase();
        return normalizedBackupRoot === sourcePath || normalizedBackupRoot.startsWith(`${sourcePath}${path.sep}`);
      });
      if (unsafeSource) {
        return { ok: false, error: 'destination-inside-source', sourcePath: unsafeSource.resolvedPath };
      }
      await fs.promises.mkdir(backupRoot, { recursive: true });

      const copiedLocations = [];
      const totals = { bytes: 0, files: 0, dirs: 0, truncated: false };

      for (const [index, location] of validLocations.entries()) {
        const folderName = `${index + 1} - ${sanitizeBackupSegment(location.type || location.label || 'location')}`;
        const destinationPath = path.join(backupRoot, folderName);
        const summary = { bytes: 0, files: 0, dirs: 0, truncated: false };
        await copySavePath(location.resolvedPath, destinationPath, summary);
        totals.bytes += summary.bytes;
        totals.files += summary.files;
        totals.dirs += summary.dirs;
        totals.truncated = totals.truncated || summary.truncated;
        copiedLocations.push({
          label: location.label || location.type || 'Location',
          type: location.type || 'unknown',
          source: location.source || 'pcgamingwiki',
          rawPath: location.rawPath || location.path || '',
          resolvedPath: location.resolvedPath,
          backupPath: destinationPath,
          relativeBackupPath: folderName,
          ...summary,
        });
      }

      const manifest = {
        version: 1,
        kind: 'gamepilot-save-backup',
        createdAt: Date.now(),
        game: {
          name: game.name || game.title || 'Unknown Game',
          appid: game.appid || game.steam_appid || game.appId || null,
          platform: game.platform || null,
        },
        restoreSupported: false,
        locations: copiedLocations,
        totals,
      };
      const manifestPath = path.join(backupRoot, 'manifest.json');
      await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

      return { ok: true, backupPath: backupRoot, manifestPath, manifest };
    } catch (err) {
      return { ok: false, error: err.message || 'create-save-backup-failed' };
    }
  });

  ipcMain.handle('preview-save-restore', async (_event, payload = {}) => {
    const manifestPath = String(payload?.manifestPath || '').trim();
    const game = payload?.game || {};
    if (!manifestPath) return { ok: false, error: 'missing-manifest' };

    try {
      const rawManifest = await fs.promises.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(rawManifest);
      if (manifest?.kind !== 'gamepilot-save-backup' || !Array.isArray(manifest.locations)) {
        return { ok: false, error: 'invalid-manifest' };
      }

      const comparisons = [];
      for (const location of manifest.locations.slice(0, 10)) {
        const backupSummary = await getBackupPathSummary(location.backupPath);
        const liveSummary = await getSaveLocationStatus(
          {
            label: location.label,
            type: location.type,
            source: location.source,
            path: location.resolvedPath,
          },
          game
        );

        comparisons.push({
          label: location.label || location.type || 'Location',
          type: location.type || 'unknown',
          backupPath: location.backupPath || '',
          targetPath: location.resolvedPath || '',
          backupExists: backupSummary.exists,
          targetExists: liveSummary.exists,
          backupBytes: backupSummary.bytes,
          backupFiles: backupSummary.files,
          targetBytes: liveSummary.bytes,
          targetFiles: liveSummary.files,
          wouldOverwrite: Boolean(liveSummary.exists),
          backupTruncated: Boolean(backupSummary.truncated),
          targetTruncated: Boolean(liveSummary.truncated),
          safeToRestore: false,
        });
      }

      return {
        ok: true,
        restoreSupported: false,
        manifestPath,
        backupPath: path.dirname(manifestPath),
        manifest,
        comparisons,
        message: 'Restore preflight only. GamePilot did not copy or overwrite any live save files.',
      };
    } catch (err) {
      return { ok: false, error: err.message || 'preview-save-restore-failed' };
    }
  });

  ipcMain.handle('restore-save-backup', async (_event, payload = {}) => {
    const manifestPath = String(payload?.manifestPath || '').trim();
    const game = payload?.game || {};
    const confirmation = String(payload?.confirmation || '').trim();
    const expectedConfirmation = String(game?.name || game?.title || 'RESTORE').trim();

    if (!expectedConfirmation || confirmation !== expectedConfirmation)
      return { ok: false, error: 'confirmation-mismatch' };

    try {
      const rawManifest = await fs.promises.readFile(manifestPath, 'utf8');
      const manifest = JSON.parse(rawManifest);
      if (manifest?.kind !== 'gamepilot-save-backup' || !Array.isArray(manifest.locations)) {
        return { ok: false, error: 'invalid-manifest' };
      }

      const manifestRoot = path.dirname(manifestPath);
      const manifestRootStat = await fs.promises.stat(manifestRoot);
      if (!manifestRootStat.isDirectory()) return { ok: false, error: 'invalid-manifest-root' };

      const restoredLocations = [];
      const totals = { bytes: 0, files: 0, dirs: 0, truncated: false };
      const startedAt = Date.now();

      for (const location of manifest.locations.slice(0, 10)) {
        const backupPath = path.resolve(
          location.backupPath || path.join(manifestRoot, location.relativeBackupPath || '')
        );
        const targetPath = path.resolve(location.resolvedPath || '');
        if (!backupPath || !targetPath) return { ok: false, error: 'invalid-restore-location' };
        if (!isPathInside(backupPath, manifestRoot))
          return { ok: false, error: 'backup-outside-manifest-root', backupPath };
        if (isPathInside(targetPath, manifestRoot) || targetPath === manifestRoot)
          return { ok: false, error: 'target-inside-backup-root', targetPath };

        const backupSummary = await getBackupPathSummary(backupPath);
        if (!backupSummary.exists) return { ok: false, error: 'missing-backup-location', backupPath };

        const summary = { bytes: 0, files: 0, dirs: 0, truncated: false };
        await copyRestorePath(backupPath, targetPath, summary, 0, startedAt);
        totals.bytes += summary.bytes;
        totals.files += summary.files;
        totals.dirs += summary.dirs;
        totals.truncated = totals.truncated || summary.truncated;
        restoredLocations.push({
          label: location.label || location.type || 'Location',
          type: location.type || 'unknown',
          backupPath,
          targetPath,
          ...summary,
        });
      }

      const receipt = {
        version: 1,
        kind: 'gamepilot-save-restore-receipt',
        restoredAt: Date.now(),
        sourceManifestPath: manifestPath,
        game: manifest.game || {
          name: game.name || game.title || 'Unknown Game',
          appid: game.appid || game.steam_appid || game.appId || null,
          platform: game.platform || null,
        },
        locations: restoredLocations,
        totals,
      };
      const receiptPath = path.join(
        manifestRoot,
        `restore-receipt-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      );
      await fs.promises.writeFile(receiptPath, JSON.stringify(receipt, null, 2), 'utf8');

      return {
        ok: true,
        manifestPath,
        backupPath: manifestRoot,
        receiptPath,
        receipt,
        message: `Restored ${totals.files} file${totals.files === 1 ? '' : 's'} without deleting unknown live files.`,
      };
    } catch (err) {
      return { ok: false, error: err.message || 'restore-save-backup-failed' };
    }
  });

  ipcMain.handle('disk-folder-size', async (_event, payload) => {
    const target = String(payload?.path || '').trim();
    if (!target) return { ok: false, error: 'invalid-path' };
    try {
      const stat = await fs.promises.stat(target);
      if (!stat.isDirectory()) {
        // For a single executable just return its file size.
        return { ok: true, bytes: stat.size, files: 1, dirs: 0, truncated: false, durationMs: 0 };
      }
    } catch (err) {
      return { ok: false, error: 'not-found' };
    }
    try {
      const result = await walkFolderSize(target);
      return { ok: true, ...result };
    } catch (err) {
      return { ok: false, error: err.message || 'walk-failed' };
    }
  });
}

module.exports = { registerIpcHandlers, walkFolderSize };
