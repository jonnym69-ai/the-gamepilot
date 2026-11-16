/**
 * Game Bar / ShadowPlay capture indexer.
 *
 * Reads the user's own gameplay captures from the standard record folders —
 * Xbox Game Bar → <Videos>\Captures, NVIDIA → <Videos>\NVIDIA, plus the
 * <Videos> root Game Bar also writes to — where <Videos> and <Pictures> are
 * the user's real shell folders (registry-resolved; users relocate them to
 * other drives all the time) with the homedir paths kept as fallback. Also
 * scans the Windows Screenshots folder ("Screenshot YYYY-MM-DD HHMMSS.png").
 * Filenames carry a timestamp and an optional title prefix — anything else
 * in those folders is ignored, so unrelated personal files are never touched.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const { shell } = require('electron');
const { findAllScreenshotDirs } = require('./screenshots');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const VIDEO_EXT = new Set(['.mp4', '.mkv', '.webm', '.mov']);
const MAX_ITEMS = 1500;
// The generic Screenshots pool is for manual review, not the primary source —
// it's capped so heavy Win+PrtScn use can't crowd real captures out.
const MAX_GENERIC_ITEMS = 600;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

// "Grand Theft Auto V Enhanced 2026-11-13 22-45-12.mp4" and bare
// "2026-11-03 23-59-25.mp4" (Game Bar couldn't resolve a title) both parse.
const CAPTURE_NAME_RE =
  /^(?:(?<title>.+?)\s+)?(?<date>\d{4}-\d{2}-\d{2}) (?<time>\d{2}-\d{2}-\d{2})(?:\s*\(\d+\))?\.(?<ext>png|jpe?g|webp|mp4|mkv|webm|mov)$/i;
// Game Bar's other flavour: "HoboRPG 15_11_2026 15_48_50.png" — D_M_Y on
// day-first locales, M_D_Y on month-first. When both numbers are ≤12 the
// file's mtime decides which reading is real.
const GAMEBAR_DMY_RE =
  /^(?:(?<title>.+?)\s+)?(?<n1>\d{2})_(?<n2>\d{2})_(?<year>\d{4}) (?<time>\d{2}_\d{2}_\d{2})(?:\s*\(\d+\))?\.(?<ext>png|jpe?g|webp|mp4|mkv|webm|mov)$/i;
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

// The real Videos/Pictures locations — users can relocate shell folders to
// any drive (Game Bar follows them), so homedir alone isn't enough.
const SHELL_FOLDERS_KEY = 'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders';

const runQuery = (command) => {
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

const getShellFolder = (name) => {
  const out = runQuery(`reg query "${SHELL_FOLDERS_KEY}" /v "${name}"`);
  const line = out.split('\n').find((entry) => entry.trim().startsWith(name));
  const match = line?.match(/REG_(?:SZ|EXPAND_SZ)\s+(.+?)\s*$/);
  if (!match) return null;
  const resolved = match[1].replace(/%([^%]+)%/g, (token, envName) => process.env[envName] || token);
  try {
    return fs.existsSync(resolved) ? resolved : null;
  } catch {
    return null;
  }
};

const parseCaptureFileName = (fileName, mtimeMs = 0) => {
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

  const gameBar = GAMEBAR_DMY_RE.exec(value);
  if (gameBar) {
    const ext = `.${gameBar.groups.ext.toLowerCase()}`;
    const n1 = Number(gameBar.groups.n1);
    const n2 = Number(gameBar.groups.n2);
    const year = Number(gameBar.groups.year);
    const [hour, minute, second] = gameBar.groups.time.split('_').map(Number);
    // Two readings: day-first (n1=day, n2=month) and month-first. A reading
    // is only real if the month lands in 1..12 and the day fits that month.
    const dayFirst = new Date(year, n2 - 1, n1, hour, minute, second).getTime();
    const monthFirst = new Date(year, n1 - 1, n2, hour, minute, second).getTime();
    const dmyValid = n2 >= 1 && n2 <= 12 && n1 >= 1 && new Date(dayFirst).getDate() === n1;
    const mdyValid = n1 >= 1 && n1 <= 12 && n2 >= 1 && new Date(monthFirst).getDate() === n2;
    let capturedAt;
    if (dmyValid && !mdyValid) capturedAt = dayFirst;
    else if (mdyValid && !dmyValid) capturedAt = monthFirst;
    else if (dmyValid && mdyValid) {
      // Ambiguous (e.g. 05_06) — trust the filesystem's own write time.
      capturedAt =
        mtimeMs > 0 && Math.abs(dayFirst - mtimeMs) <= Math.abs(monthFirst - mtimeMs) ? dayFirst : monthFirst;
      if (!mtimeMs) capturedAt = dayFirst;
    } else return null;
    if (!Number.isFinite(capturedAt)) return null;
    return {
      titleHint: gameBar.groups.title ? gameBar.groups.title.trim() : null,
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

const dedupeExisting = (dirs) => {
  const seen = new Set();
  return dirs.filter((dir) => {
    const resolved = path.resolve(dir).toLowerCase();
    if (seen.has(resolved)) return false;
    seen.add(resolved);
    try {
      return fs.existsSync(dir);
    } catch {
      return false;
    }
  });
};

const getGenericScreenshotDirs = () => {
  const roots = new Set([path.join(os.homedir(), 'Pictures')]);
  const realPictures = getShellFolder('My Pictures');
  if (realPictures) roots.add(realPictures);
  return dedupeExisting(Array.from(roots).map((root) => path.join(root, 'Screenshots')));
};

const getCaptureDirs = () => {
  const videoRoots = new Set([path.join(os.homedir(), 'Videos')]);
  const realVideos = getShellFolder('My Video');
  if (realVideos) videoRoots.add(realVideos);
  const candidates = [];
  for (const videosDir of videoRoots) {
    candidates.push(path.join(videosDir, 'Captures'), path.join(videosDir, 'NVIDIA'), videosDir);
  }
  return dedupeExisting(candidates.concat(getGenericScreenshotDirs()));
};

const listCaptures = () => {
  const items = [];
  const genericDirs = new Set(getGenericScreenshotDirs().map((dir) => path.resolve(dir).toLowerCase()));
  // A redirected Videos root (e.g. A:\) contains Captures/NVIDIA as
  // subfolders — the one-level descent would scan them twice otherwise.
  const scannedDirs = new Set();
  for (const dir of getCaptureDirs()) {
    const dirs = [dir];
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) dirs.push(path.join(dir, entry.name));
      }
    } catch {
      continue;
    }
    const isWindowsScreenshots = genericDirs.has(path.resolve(dir).toLowerCase());
    for (const scanDir of dirs) {
      const resolvedScan = path.resolve(scanDir).toLowerCase();
      if (scannedDirs.has(resolvedScan)) continue;
      scannedDirs.add(resolvedScan);
      let entries;
      try {
        entries = fs.readdirSync(scanDir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const filePath = path.join(scanDir, entry.name);
        let mtimeMs = 0;
        try {
          mtimeMs = fs.statSync(filePath).mtimeMs;
        } catch {
          /* keep 0 — parser falls back to its filename reading */
        }
        const parsed = parseCaptureFileName(entry.name, mtimeMs);
        if (!parsed) continue;
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

  items.sort((a, b) => b.capturedAt - a.capturedAt || a.name.localeCompare(b.name));
  const real = items.filter((item) => item.source !== 'windows-screenshots');
  const generic = items.filter((item) => item.source === 'windows-screenshots').slice(0, MAX_GENERIC_ITEMS);
  return real.concat(generic).sort((a, b) => b.capturedAt - a.capturedAt || a.name.localeCompare(b.name)).slice(0, MAX_ITEMS);
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
