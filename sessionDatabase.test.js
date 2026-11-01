/**
 * @jest-environment node
 *
 * SessionDatabase regression tests — real sql.js against a temp userData dir.
 * Covers the replace-history shrink guards, rolling backups, and restore.
 * (node env so sql.js resolves its fs-backed wasm build, not the browser one)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const SessionDatabase = require('./sessionDatabase');

const makeEntry = (id, minutes = 10) => ({
  sessionId: `s-${id}`,
  gameName: `Game ${id}`,
  playtimeMinutes: minutes,
  endTime: new Date(Date.UTC(2024, 0, 1, 12, id % 60)).toISOString(),
});

const makeEntries = (count, offset = 0) => Array.from({ length: count }, (_, i) => makeEntry(offset + i + 1));

const tempDirs = [];

const createDb = async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gamepilot-session-db-'));
  tempDirs.push(dir);
  const db = new SessionDatabase(dir);
  await db.readyPromise;
  return db;
};

afterEach(() => {
  while (tempDirs.length) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('SessionDatabase replace guards', () => {
  test('rejects an empty replace when rows exist', async () => {
    const db = await createDb();
    await db.replaceHistory(makeEntries(5));

    const result = await db.replaceHistory([]);

    expect(result).toMatchObject({ ok: false, rejected: true, existing: 5, incoming: 0 });
    expect(db.getSnapshot().sessionHistory).toHaveLength(5);
  });

  test('rejects a >50% shrink at >= 20 existing rows', async () => {
    const db = await createDb();
    await db.replaceHistory(makeEntries(25));

    const result = await db.replaceHistory(makeEntries(10, 100));

    expect(result).toMatchObject({ ok: false, rejected: true, existing: 25, incoming: 10 });
    expect(db.getSnapshot().sessionHistory).toHaveLength(25);
  });

  test('accepts the same shrink with force', async () => {
    const db = await createDb();
    await db.replaceHistory(makeEntries(25));

    const result = await db.replaceHistory(makeEntries(10, 100), { force: true });

    expect(result).toMatchObject({ ok: true, existing: 25, incoming: 10 });
    expect(db.getSnapshot().sessionHistory).toHaveLength(10);
  });

  test('accepts normal growth without force', async () => {
    const db = await createDb();
    await db.replaceHistory(makeEntries(5));

    const result = await db.replaceHistory(makeEntries(8, 50));

    expect(result).toMatchObject({ ok: true, existing: 5, incoming: 8 });
    expect(db.getSnapshot().sessionHistory).toHaveLength(8);
  });
});

describe('SessionDatabase rolling backups', () => {
  test('creates a startup backup on init and prunes to the newest 10', async () => {
    const db = await createDb();
    await db.replaceHistory(makeEntries(3));

    let backups = await db.listBackups();
    expect(backups.some((backup) => backup.file.endsWith('-startup.sqlite'))).toBe(true);

    for (let i = 0; i < 11; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await db.backupHistory(`r${i}`);
    }

    backups = await db.listBackups();
    expect(backups).toHaveLength(10);
    expect(backups.some((backup) => backup.file.endsWith('-r10.sqlite'))).toBe(true);
  });

  test('backupHistory never throws and skips same-day duplicate reasons', async () => {
    const db = await createDb();
    const first = await db.backupHistory('pre-replace');
    const second = await db.backupHistory('pre-replace');

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.file).toBe(first.file);
  });
});

describe('SessionDatabase restore', () => {
  test('restoreBackup round-trips the history snapshot', async () => {
    const db = await createDb();
    await db.replaceHistory(makeEntries(6));
    const backup = await db.backupHistory('roundtrip');

    await db.clear();
    expect(db.getSnapshot().sessionHistory).toHaveLength(0);

    const result = await db.restoreBackup(backup.file);

    expect(result.ok).toBe(true);
    expect(result.snapshot.sessionHistory).toHaveLength(6);
    expect(db.getSnapshot().sessionHistory).toHaveLength(6);
    // A pre-restore safety copy of the (empty) current db was taken first.
    const backups = await db.listBackups();
    expect(backups.some((entry) => entry.file.endsWith('-pre-restore.sqlite'))).toBe(true);
  });

  test('rejects unknown and path-traversal backup names', async () => {
    const db = await createDb();
    await db.replaceHistory(makeEntries(4));

    for (const bad of ['../evil.sqlite', '..\\..\\x.sqlite', 'session-history-1999-01-01-x.sqlite']) {
      // eslint-disable-next-line no-await-in-loop
      const result = await db.restoreBackup(bad);
      expect(result).toMatchObject({ ok: false, error: 'unknown-backup' });
    }
    expect(db.getSnapshot().sessionHistory).toHaveLength(4);
  });
});
