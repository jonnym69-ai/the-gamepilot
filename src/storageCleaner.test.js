// Unit tests for the main-process storage cleaner (electron/storageCleaner.js).
// Lives under src/ so Jest picks it up; the module itself is plain CommonJS and
// is exercised through a real temp-dir fixture — no real system dirs are read.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { findOrphanedShaderCaches, scanForItems, registerIpcHandlers } from '../electron/storageCleaner';

let root;
let libA; // steamapps dir 1
let libB; // steamapps dir 2
let crashDumpsDir;

const writeFile = (filePath, content = 'x') => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
};

const writeManifest = (steamAppsDir, appid, name) =>
  writeFile(
    path.join(steamAppsDir, `appmanifest_${appid}.acf`),
    `"AppState"\n{\n\t"appid"\t\t"${appid}"\n\t"name"\t\t"${name}"\n}`
  );

const writeShaderCache = (steamAppsDir, appid, bytes = 2048) =>
  writeFile(path.join(steamAppsDir, 'shadercache', String(appid), 'blob.bin'), Buffer.alloc(bytes));

beforeAll(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'gamepilot-cleaner-'));
  libA = path.join(root, 'libA', 'steamapps');
  libB = path.join(root, 'libB', 'steamapps');

  // Installed in library A — its shadercache is NOT an orphan.
  writeManifest(libA, '111', 'Installed Game A');
  writeShaderCache(libA, '111');

  // Installed only in library B — a manifest in ANY steamapps dir counts.
  writeManifest(libB, '444', 'Installed Game B');
  writeShaderCache(libA, '444');

  // Orphans: no manifest anywhere.
  writeShaderCache(libA, '222');
  writeShaderCache(libB, '555');

  // Steamworks Common Redistributables — always ignored.
  writeShaderCache(libA, '228980');

  // Non-appid junk dirs inside shadercache are ignored.
  fs.mkdirSync(path.join(libA, 'shadercache', 'not-an-appid'), { recursive: true });
  writeFile(path.join(libA, 'shadercache', 'readme.txt'), 'not a dir');

  // Windows crash dumps fixture.
  crashDumpsDir = path.join(root, 'CrashDumps');
  writeFile(path.join(crashDumpsDir, 'game.exe.1234.dmp'), Buffer.alloc(4096));
  writeFile(path.join(crashDumpsDir, 'other.exe.5678.dmp'), Buffer.alloc(1024));
  writeFile(path.join(crashDumpsDir, 'not-a-dump.txt'), 'ignore me');
});

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

describe('findOrphanedShaderCaches', () => {
  test('flags only appid dirs with no manifest in any library', async () => {
    const orphans = await findOrphanedShaderCaches([libA, libB]);
    const appids = orphans.map((o) => o.appid).sort();

    expect(appids).toEqual(['222', '555']);
    // A manifest in the OTHER library must count as installed.
    expect(orphans.find((o) => o.appid === '444')).toBeUndefined();
    // Steamworks Common Redistributables + non-numeric dirs are ignored.
    expect(orphans.find((o) => o.appid === '228980')).toBeUndefined();
  });

  test('labels unresolved orphans honestly', async () => {
    const orphans = await findOrphanedShaderCaches([libA, libB]);
    expect(orphans.find((o) => o.appid === '222').label).toBe('Steam app 222 (uninstalled)');
  });
});

describe('scanForItems', () => {
  test('returns shader orphans with measured sizes', async () => {
    const items = await scanForItems({ steamAppsDirs: [libA, libB], platform: 'linux' });
    const shaders = items.filter((i) => i.kind === 'steam-shader-orphan');

    expect(shaders).toHaveLength(2);
    shaders.forEach((item) => {
      expect(item.bytes).toBe(2048);
      expect(item.id).toContain('steam-shader-orphan:');
      expect(typeof item.path).toBe('string');
    });
    // Non-Windows platforms never report crash dumps.
    expect(items.find((i) => i.kind === 'crash-dump')).toBeUndefined();
  });

  test('lists *.dmp crash dumps on Windows only', async () => {
    const items = await scanForItems({
      steamAppsDirs: [libA, libB],
      crashDumpsDir,
      platform: 'win32',
    });
    const dumps = items.filter((i) => i.kind === 'crash-dump');

    expect(dumps).toHaveLength(2);
    expect(dumps.map((d) => d.bytes).sort((a, b) => a - b)).toEqual([1024, 4096]);
    expect(dumps.find((d) => d.label.includes('not-a-dump'))).toBeUndefined();
  });
});

describe('storage-cleaner IPC', () => {
  const buildHarness = (trashItem) => {
    const handlers = {};
    const ipcMain = { handle: (name, fn) => (handlers[name] = fn) };
    registerIpcHandlers(ipcMain, {
      getSteamInstallPaths: () => [libA, libB],
      localAppData: root, // CrashDumps sits at <root>/CrashDumps
      platform: 'win32',
      trashItem,
    });
    return handlers;
  };

  test('scan returns items and a total', async () => {
    const handlers = buildHarness(jest.fn());
    const result = await handlers['storage-cleaner-scan']();

    expect(result.ok).toBe(true);
    expect(result.items.length).toBeGreaterThanOrEqual(4); // 2 orphans + 2 dumps
    expect(result.totalBytes).toBeGreaterThan(0);
  });

  test('clean trashes allowlisted ids and nothing else', async () => {
    const trashItem = jest.fn().mockResolvedValue();
    const handlers = buildHarness(trashItem);

    const scan = await handlers['storage-cleaner-scan']();
    const targetIds = scan.items.slice(0, 2).map((i) => i.id);
    const clean = await handlers['storage-cleaner-clean'](null, { ids: targetIds });

    expect(clean.ok).toBe(true);
    expect(clean.results).toHaveLength(2);
    expect(clean.results.every((r) => r.ok)).toBe(true);
    expect(trashItem).toHaveBeenCalledTimes(2);
    // Only the scanned paths are trashed — ids map back to real paths.
    const scannedPaths = new Set(scan.items.map((i) => i.path));
    trashItem.mock.calls.forEach(([p]) => expect(scannedPaths.has(p)).toBe(true));
  });

  test('clean rejects unknown ids and ids missing from the fresh scan', async () => {
    const trashItem = jest.fn().mockResolvedValue();
    const handlers = buildHarness(trashItem);

    const scan = await handlers['storage-cleaner-scan']();
    const orphanId = scan.items.find((i) => i.kind === 'steam-shader-orphan' && i.label.includes('222')).id;

    // A manifest appearing between scan and clean removes the orphan from the
    // fresh allowlist — the stale id must be refused.
    writeManifest(libA, '222', 'Reinstalled Game');

    const clean = await handlers['storage-cleaner-clean'](null, {
      ids: [orphanId, 'totally-bogus-id', '..\\..\\Windows\\System32', 42],
    });

    expect(clean.ok).toBe(true);
    expect(clean.results).toHaveLength(3); // non-string entries are dropped
    expect(clean.results.every((r) => !r.ok)).toBe(true);
    expect(clean.results.every((r) => r.error === 'not-in-scan')).toBe(true);
    expect(trashItem).not.toHaveBeenCalled();
  });

  test('per-item trash failures are reported, not thrown', async () => {
    const trashItem = jest.fn().mockRejectedValue(new Error('file is locked'));
    const handlers = buildHarness(trashItem);

    const scan = await handlers['storage-cleaner-scan']();
    const clean = await handlers['storage-cleaner-clean'](null, { ids: [scan.items[0].id] });

    expect(clean.ok).toBe(true);
    expect(clean.results[0].ok).toBe(false);
    expect(clean.results[0].error).toContain('locked');
  });
});
