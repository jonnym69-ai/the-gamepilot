// Local Steam screenshots — reads the user's own captures from
// <steam>/userdata/<account>/760/remote/<appid>/screenshots (and its
// thumbnails/ subfolder). No network, no account — files already on disk.
// The renderer gets names + data-URI thumbs; open requests are re-validated
// against the discovered dirs and bare filenames only, never raw paths.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png']);
const MAX_SHOTS = 30;
const MAX_THUMB_BYTES = 220 * 1024;

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

const getSteamRoots = () => {
  const roots = new Set();
  const out = runQuery('reg query "HKCU\\SOFTWARE\\Valve\\Steam" /v SteamPath');
  const steamPath = (out.match(/SteamPath\s+REG_SZ\s+(.+)/) || [])[1]?.trim();
  if (steamPath) roots.add(steamPath);
  for (const letter of 'CDEFG'.split('')) {
    if (!fs.existsSync(`${letter}:\\`)) continue;
    roots.add(`${letter}:\\Program Files (x86)\\Steam`);
    roots.add(`${letter}:\\Program Files\\Steam`);
    roots.add(`${letter}:\\Steam`);
  }
  return Array.from(roots).filter((root) => {
    try {
      return fs.existsSync(root);
    } catch {
      return false;
    }
  });
};

// Every userdata/<account>/760/remote/<appid>/screenshots dir that exists.
const findScreenshotDirs = (appid) => {
  const dirs = [];
  for (const root of getSteamRoots()) {
    const userdata = path.join(root, 'userdata');
    let accounts = [];
    try {
      accounts = fs.readdirSync(userdata, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of accounts) {
      if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) continue;
      const dir = path.join(userdata, entry.name, '760', 'remote', String(appid), 'screenshots');
      try {
        if (fs.existsSync(dir)) dirs.push(dir);
      } catch {
        /* unreadable dir — skip */
      }
    }
  }
  return dirs;
};

const readThumb = (dir, file) => {
  const candidates = [path.join(dir, 'thumbnails', file), path.join(dir, file)];
  for (const candidate of candidates) {
    try {
      const stat = fs.statSync(candidate);
      if (stat.size > MAX_THUMB_BYTES) continue;
      const buffer = fs.readFileSync(candidate);
      const ext = path.extname(candidate).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
      /* no thumb at this candidate */
    }
  }
  return null;
};

const listScreenshots = (appid) => {
  const shots = [];
  for (const dir of findScreenshotDirs(appid)) {
    let files = [];
    try {
      files = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of files) {
      if (!entry.isFile() || !IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) continue;
      let mtime = 0;
      try {
        mtime = fs.statSync(path.join(dir, entry.name)).mtimeMs;
      } catch {
        /* keep 0 */
      }
      shots.push({ dir, name: entry.name, mtime });
    }
  }
  return shots
    .sort((a, b) => b.mtime - a.mtime || a.name.localeCompare(b.name))
    .slice(0, MAX_SHOTS)
    .map((shot) => ({
      dir: shot.dir,
      name: shot.name,
      mtime: Math.round(shot.mtime),
      thumb: readThumb(shot.dir, shot.name),
    }));
};

const validAppId = (value) => {
  const id = String(value ?? '').replace(/[^0-9]/g, '');
  return id && Number(id) > 0 ? id : null;
};

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('game-screenshots', async (_event, appid) => {
    const id = validAppId(appid);
    if (!id) return { ok: false, error: 'invalid-appid' };
    try {
      return { ok: true, shots: listScreenshots(id) };
    } catch (error) {
      console.warn('[Screenshots] list failed:', error.message);
      return { ok: false, error: 'screenshots-unavailable' };
    }
  });

  ipcMain.handle('open-screenshot', async (_event, payload) => {
    const id = validAppId(payload?.appid);
    const name = String(payload?.name || '');
    const dir = String(payload?.dir || '');
    // Re-validate: dir must be one of the discovered dirs for this appid and
    // name a bare image filename — the renderer cannot request arbitrary paths.
    if (!id || !name || name !== path.basename(name) || !IMAGE_EXT.has(path.extname(name).toLowerCase())) {
      return { ok: false, error: 'invalid-request' };
    }
    const allowed = new Set(findScreenshotDirs(id).map((d) => path.resolve(d)));
    const target = allowed.has(path.resolve(dir)) ? path.join(dir, name) : null;
    if (!target || !fs.existsSync(target)) return { ok: false, error: 'not-found' };
    try {
      const { shell } = require('electron');
      const result = await shell.openPath(target);
      return result ? { ok: false, error: result } : { ok: true };
    } catch (error) {
      console.warn('[Screenshots] open failed:', error.message);
      return { ok: false, error: 'open-failed' };
    }
  });
}

module.exports = { registerIpcHandlers, findScreenshotDirs, listScreenshots };
