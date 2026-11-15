/**
 * Game Bar / ShadowPlay capture indexer.
 *
 * Reads the user's own gameplay captures from the standard record folders
 * (Xbox Game Bar → ~\Videos\Captures, NVIDIA → ~\Videos\NVIDIA, plus the
 * ~\Videos root Game Bar also writes to), plus the Windows
 * ~\Pictures\Screenshots folder ("Screenshot YYYY-MM-DD HHMMSS.png").
 * Filenames carry a timestamp and an optional title prefix — anything else
 * in those folders is ignored, so unrelated personal files are never touched.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { shell } = require('electron');
const { findAllScreenshotDirs } = require('./screenshots');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const VIDEO_EXT = new Set(['.mp4', '.mkv', '.webm', '.mov']);
const MAX_ITEMS = 1500;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

// "Grand Theft Auto V Enhanced 2026-11-13 22-45-12.mp4" and bare
// "2026-11-03 23-59-25.mp4" (Game Bar couldn't resolve a title) both parse.
const CAPTURE_NAME_RE =
  /^(?:(?<title>.+?)\s+)?(?<date>\d{4}-\d{2}-\d{2}) (?<time>\d{2}-\d{2}-\d{2})(?:\s*\(\d+\))?\.(?<ext>png|jpe?g|webp|mp4|mkv|webm|mov)$/i;
const WINDOWS_SCREENSHOT_RE =
  /^Screenshot (?<date>\d{4}-\d{2}-\d{2}) (?<hour>\d{2})(?<minute>\d{2})(?<second>\d{2})\.(?<ext>png|jpe?g|webp)$/i;
// Steam F12 shots: "20260816163851_1.jpg" under remote/<appid>/screenshots.
const STEAM_SHOT_RE = /^(?<ts>\d{14})(?:_\d+)?\.(?<ext>jpe?g|png)$/i;

const parseSteamShotName = (fileName) => {
  const match = STEAM_SHOT_RE.exec(String(fileName || ''));
  if (!match) return null;
  const ts = match.groups.ts;
  const capturedAt = new Date(
    Number(ts.slice(0, 4)),
    Number(ts.slice(4, 6)) - 1,
    Number(ts.slice(6, 8)),
    Number(ts.slice(8, 10)),
    Number(ts.slice(10, 12)),
    Number(ts.slice(12, 14))
  ).getTime();
  return Number.isFinite(capturedAt) ? { capturedAt } : null;
};

const parseCaptureFileName = (fileName) => {
  const value = String(fileName || '');
  const match = CAPTURE_NAME_RE.exec(value);
  if (match) {
    const ext = `.${match.groups.ext.toLowerCase()}`;
    const [year, month, day] = match.groups.date.split('-').map(Number);
    const [hour, minute, second] = match.groups.time.split('-').map(Number);
    const capturedAt = new Date(year, month - 1, day, hour, minute, second).getTime();
    if (!Number.isFinite(capturedAt)) return null;
    return {
      titleHint: match.groups.title ? match.groups.title.trim() : null,
      capturedAt,
      kind: VIDEO_EXT.has(ext) ? 'video' : 'image',
    };
  }

  const screenshot = WINDOWS_SCREENSHOT_RE.exec(value);
  if (!screenshot) return null;
  const [year, month, day] = screenshot.groups.date.split('-').map(Number);
  const capturedAt = new Date(
    year,
    month - 1,
    day,
    Number(screenshot.groups.hour),
    Number(screenshot.groups.minute),
    Number(screenshot.groups.second)
  ).getTime();
  if (!Number.isFinite(capturedAt)) return null;
  return { titleHint: null, capturedAt, kind: 'image' };
};

const getCaptureDirs = () => {
  const videosDir = path.join(os.homedir(), 'Videos');
  const candidates = [
    path.join(videosDir, 'Captures'),
    path.join(videosDir, 'NVIDIA'),
    videosDir,
    path.join(os.homedir(), 'Pictures', 'Screenshots'),
  ];
  const seen = new Set();
  return candidates.filter((dir) => {
    const resolved = path.resolve(dir).toLowerCase();
    if (seen.has(resolved)) return false;
    seen.add(resolved);
    return fs.existsSync(dir);
  });
};

const listCaptures = () => {
  const items = [];
  for (const dir of getCaptureDirs()) {
    // Top level plus one level of subfolders — ShadowPlay sorts clips into
    // per-game directories under Videos\NVIDIA\<Title>.
    const dirs = [dir];
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) dirs.push(path.join(dir, entry.name));
      }
    } catch {
      continue;
    }
    for (const scanDir of dirs) {
      let entries;
      try {
        entries = fs.readdirSync(scanDir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const parsed = parseCaptureFileName(entry.name);
        if (!parsed) continue;
        const filePath = path.join(scanDir, entry.name);
        const isWindowsScreenshots =
          path.resolve(dir).toLowerCase() === path.resolve(os.homedir(), 'Pictures', 'Screenshots').toLowerCase();
        items.push({
          dir: scanDir,
          name: entry.name,
          filePath,
          fileUrl: `file:///${filePath.replace(/\\/g, '/')}`,
          source: isWindowsScreenshots ? 'windows-screenshots' : 'gameplay-recorder',
          ...parsed,
        });
      }
    }
  }

  // Steam F12 screenshots — the appid folder names the game, thumbnails are
  // never read (files only, no descent).
  for (const { dir, appid } of findAllScreenshotDirs()) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const parsed = parseSteamShotName(entry.name);
      if (!parsed) continue;
      const filePath = path.join(dir, entry.name);
      items.push({
        dir,
        name: entry.name,
        filePath,
        fileUrl: `file:///${filePath.replace(/\\/g, '/')}`,
        source: 'steam',
        steamAppId: appid,
        titleHint: null,
        kind: 'image',
        ...parsed,
      });
    }
  }

  return items.sort((a, b) => b.capturedAt - a.capturedAt || a.name.localeCompare(b.name)).slice(0, MAX_ITEMS);
};

const isDirAllowed = (dir) => {
  const resolved = path.resolve(dir).toLowerCase();
  const roots = getCaptureDirs().concat(findAllScreenshotDirs().map((entry) => entry.dir));
  return roots.some((root) => {
    const r = path.resolve(root).toLowerCase();
    return resolved === r || resolved.startsWith(r + path.sep);
  });
};

const resolveCaptureFile = (dir, name) => {
  if (typeof dir !== 'string' || typeof name !== 'string' || name !== path.basename(name)) return null;
  if (!isDirAllowed(dir)) return null;
  const target = path.join(dir, name);
  return fs.existsSync(target) ? target : null;
};

const readCaptureImage = (dir, name) => {
  const target = resolveCaptureFile(dir, name);
  if (!target || !IMAGE_EXT.has(path.extname(name).toLowerCase())) return null;
  try {
    const stat = fs.statSync(target);
    if (stat.size > MAX_IMAGE_BYTES) return null;
    const buffer = fs.readFileSync(target);
    const mime = path.extname(name).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
};

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('list-captures', async () => {
    try {
      return { ok: true, captures: listCaptures() };
    } catch (error) {
      console.warn('[Captures] list failed:', error.message);
      return { ok: false, error: 'captures-unavailable' };
    }
  });

  ipcMain.handle('read-capture-image', async (_event, payload = {}) => {
    const dataUrl = readCaptureImage(payload?.dir, payload?.name);
    return dataUrl ? { ok: true, dataUrl } : { ok: false, error: 'not-readable' };
  });

  ipcMain.handle('open-capture', async (_event, payload = {}) => {
    const target = resolveCaptureFile(payload?.dir, payload?.name);
    if (!target) return { ok: false, error: 'not-found' };
    try {
      const result = await shell.openPath(target);
      return result ? { ok: false, error: result } : { ok: true };
    } catch (error) {
      console.warn('[Captures] open failed:', error.message);
      return { ok: false, error: 'open-failed' };
    }
  });
}

module.exports = { registerIpcHandlers, parseCaptureFileName, parseSteamShotName, getCaptureDirs, listCaptures };
