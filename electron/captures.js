/**
 * Game Bar / ShadowPlay capture indexer.
 *
 * Reads the user's own gameplay captures from the standard record folders
 * (Xbox Game Bar → ~\Videos\Captures, NVIDIA → ~\Videos\NVIDIA, plus the
 * ~\Videos root Game Bar also writes to). Filenames carry a trailing
 * "YYYY-MM-DD HH-MM-SS" timestamp and an optional title prefix — anything
 * else in those folders is ignored, so unrelated personal videos are never
 * touched.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { shell } = require('electron');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const VIDEO_EXT = new Set(['.mp4', '.mkv', '.webm', '.mov']);
const MAX_ITEMS = 400;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

// "Grand Theft Auto V Enhanced 2026-11-13 22-45-12.mp4" and bare
// "2026-11-03 23-59-25.mp4" (Game Bar couldn't resolve a title) both parse.
const CAPTURE_NAME_RE =
  /^(?:(?<title>.+?)\s+)?(?<date>\d{4}-\d{2}-\d{2}) (?<time>\d{2}-\d{2}-\d{2})(?:\s*\(\d+\))?\.(?<ext>png|jpe?g|webp|mp4|mkv|webm|mov)$/i;

const parseCaptureFileName = (fileName) => {
  const match = CAPTURE_NAME_RE.exec(String(fileName || ''));
  if (!match) return null;
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
};

const getCaptureDirs = () => {
  const videosDir = path.join(os.homedir(), 'Videos');
  const candidates = [path.join(videosDir, 'Captures'), path.join(videosDir, 'NVIDIA'), videosDir];
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
        items.push({
          dir: scanDir,
          name: entry.name,
          filePath,
          fileUrl: `file:///${filePath.replace(/\\/g, '/')}`,
          ...parsed,
        });
      }
    }
  }
  return items.sort((a, b) => b.capturedAt - a.capturedAt || a.name.localeCompare(b.name)).slice(0, MAX_ITEMS);
};

const isDirAllowed = (dir) => {
  const resolved = path.resolve(dir).toLowerCase();
  return getCaptureDirs().some((root) => {
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

module.exports = { registerIpcHandlers, parseCaptureFileName, getCaptureDirs, listCaptures };
