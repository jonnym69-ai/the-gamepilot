const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const HISTORY_SCHEMA_SQL = `
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS session_history (
        session_id TEXT PRIMARY KEY,
        game_name TEXT NOT NULL,
        game_id TEXT,
        started_at TEXT,
        ended_at TEXT NOT NULL,
        playtime_minutes INTEGER NOT NULL CHECK(playtime_minutes >= 0),
        payload_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_session_history_ended_at ON session_history(ended_at);
      CREATE INDEX IF NOT EXISTS idx_session_history_game_name ON session_history(game_name);
      CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `;

const BACKUP_DIR_NAME = 'session-backups';
const MAX_BACKUPS = 10;
const BACKUP_FILE_PATTERN = /^session-history-.*\.sqlite$/;

/**
 * Helper to open (or create) a single sql.js database file and run schema DDL.
 */
async function openDatabase(SQL, dbPath, schemaSql) {
  const existingData = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
  const db = existingData?.length ? new SQL.Database(existingData) : new SQL.Database();
  db.run(schemaSql);
  return db;
}

/**
 * Helper to persist a sql.js database atomically (temp file + rename).
 */
function persistDatabase(db, dbPath) {
  const temporaryPath = `${dbPath}.tmp`;
  fs.writeFileSync(temporaryPath, Buffer.from(db.export()));
  fs.renameSync(temporaryPath, dbPath);
}

/**
 * Helper to run a callback inside a transaction on a specific database
 * and persist only that database afterward.
 */
function transactionOn(db, dbPath, callback) {
  db.run('BEGIN IMMEDIATE TRANSACTION');
  try {
    const result = callback();
    db.run('COMMIT');
    persistDatabase(db, dbPath);
    return result;
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}

class SessionDatabase {
  constructor(userDataPath) {
    this.activeDbPath = path.join(userDataPath, 'gamepilot-active-sessions.sqlite');
    this.historyDbPath = path.join(userDataPath, 'gamepilot-session-history.sqlite');
    this.legacyDbPath = path.join(userDataPath, 'gamepilot-sessions.sqlite');
    this.backupDirPath = path.join(userDataPath, BACKUP_DIR_NAME);
    this.activeDb = null;
    this.historyDb = null;
    this.SQL = null;
    this.readyPromise = this.initialize();
  }

  async initialize() {
    const SQL = await initSqlJs({
      locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm'),
    });
    this.SQL = SQL;

    // If the legacy single-file database exists, migrate its data into the
    // two new files, then rename it so we don't migrate again.
    if (fs.existsSync(this.legacyDbPath)) {
      await this.migrateFromLegacyDb(SQL);
    }

    this.activeDb = await openDatabase(
      SQL,
      this.activeDbPath,
      `
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS active_sessions (
        game_name TEXT PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        start_time TEXT NOT NULL,
        last_confirmed_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
    `
    );

    this.historyDb = await openDatabase(SQL, this.historyDbPath, HISTORY_SCHEMA_SQL);

    // Ensure schema is persisted for fresh databases.
    persistDatabase(this.activeDb, this.activeDbPath);
    persistDatabase(this.historyDb, this.historyDbPath);

    // Rolling safety copy — at most one per day per reason. Never throws.
    await this.backupHistory('startup');
  }

  /**
   * One-time migration from the old single-file database to the split format.
   */
  async migrateFromLegacyDb(SQL) {
    try {
      const data = fs.readFileSync(this.legacyDbPath);
      const legacyDb = new SQL.Database(data);

      // Read active sessions from legacy db.
      const activeSessions = {};
      const activeStmt = legacyDb.prepare('SELECT game_name, payload_json FROM active_sessions');
      try {
        while (activeStmt.step()) {
          const row = activeStmt.getAsObject();
          activeSessions[row.game_name] = JSON.parse(row.payload_json);
        }
      } finally {
        activeStmt.free();
      }

      // Read session history from legacy db.
      const sessionHistory = [];
      const historyStmt = legacyDb.prepare('SELECT payload_json FROM session_history ORDER BY ended_at ASC, rowid ASC');
      try {
        while (historyStmt.step()) {
          sessionHistory.push(JSON.parse(historyStmt.getAsObject().payload_json));
        }
      } finally {
        historyStmt.free();
      }

      // Write into the new split databases.
      this.activeDb = await openDatabase(
        SQL,
        this.activeDbPath,
        `
        CREATE TABLE IF NOT EXISTS active_sessions (
          game_name TEXT PRIMARY KEY,
          session_id TEXT NOT NULL UNIQUE,
          start_time TEXT NOT NULL,
          last_confirmed_at TEXT NOT NULL,
          payload_json TEXT NOT NULL
        );
      `
      );
      this.historyDb = await openDatabase(
        SQL,
        this.historyDbPath,
        `
        CREATE TABLE IF NOT EXISTS session_history (
          session_id TEXT PRIMARY KEY,
          game_name TEXT NOT NULL,
          game_id TEXT,
          started_at TEXT,
          ended_at TEXT NOT NULL,
          playtime_minutes INTEGER NOT NULL CHECK(playtime_minutes >= 0),
          payload_json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_session_history_ended_at ON session_history(ended_at);
        CREATE INDEX IF NOT EXISTS idx_session_history_game_name ON session_history(game_name);
        CREATE TABLE IF NOT EXISTS app_metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `
      );

      // Populate active sessions.
      transactionOn(this.activeDb, this.activeDbPath, () => {
        this.activeDb.run('DELETE FROM active_sessions');
        const stmt = this.activeDb.prepare(
          'INSERT INTO active_sessions (game_name, session_id, start_time, last_confirmed_at, payload_json) VALUES (?, ?, ?, ?, ?)'
        );
        try {
          Object.entries(activeSessions).forEach(([gameName, session]) => {
            if (!session?.sessionId || !session?.startTime) return;
            stmt.run([
              gameName,
              session.sessionId,
              session.startTime,
              session.lastConfirmedAt || session.startTime,
              JSON.stringify(session),
            ]);
          });
        } finally {
          stmt.free();
        }
      });

      // Populate session history.
      transactionOn(this.historyDb, this.historyDbPath, () => {
        this.historyDb.run('DELETE FROM session_history');
        sessionHistory.forEach((entry) => this.insertHistoryEntry(entry));
        this.historyDb.run(
          "INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('local_storage_migrated', 'true')"
        );
      });

      // Rename legacy file so we never migrate again.
      fs.renameSync(this.legacyDbPath, `${this.legacyDbPath}.migrated`);
    } catch (error) {
      console.error('SessionDatabase legacy migration failed:', error);
    }
  }

  replaceActiveSessions(sessions = {}) {
    const safeSessions = sessions && typeof sessions === 'object' && !Array.isArray(sessions) ? sessions : {};
    this.activeDb.run('DELETE FROM active_sessions');
    const statement = this.activeDb.prepare(`
      INSERT INTO active_sessions (game_name, session_id, start_time, last_confirmed_at, payload_json)
      VALUES (?, ?, ?, ?, ?)
    `);
    try {
      Object.entries(safeSessions).forEach(([gameName, session]) => {
        if (!session?.sessionId || !session?.startTime) return;
        statement.run([
          gameName,
          session.sessionId,
          session.startTime,
          session.lastConfirmedAt || session.startTime,
          JSON.stringify(session),
        ]);
      });
    } finally {
      statement.free();
    }
  }

  insertHistoryEntry(entry) {
    if (!entry?.sessionId || !entry?.gameName) return false;
    this.historyDb.run(
      `
      INSERT OR IGNORE INTO session_history (
        session_id, game_name, game_id, started_at, ended_at, playtime_minutes, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [
        entry.sessionId,
        entry.gameName,
        entry.gameId == null ? null : String(entry.gameId),
        entry.startTime || null,
        entry.endTime || entry.timestamp || new Date().toISOString(),
        Math.max(0, Math.round(Number(entry.playtimeMinutes) || 0)),
        JSON.stringify(entry),
      ]
    );
    return this.historyDb.getRowsModified() > 0;
  }

  getSnapshot() {
    const activeSessions = {};
    const activeStatement = this.activeDb.prepare('SELECT game_name, payload_json FROM active_sessions');
    try {
      while (activeStatement.step()) {
        const row = activeStatement.getAsObject();
        activeSessions[row.game_name] = JSON.parse(row.payload_json);
      }
    } finally {
      activeStatement.free();
    }

    const sessionHistory = [];
    const historyStatement = this.historyDb.prepare(
      'SELECT payload_json FROM session_history ORDER BY ended_at ASC, rowid ASC'
    );
    try {
      while (historyStatement.step()) {
        sessionHistory.push(JSON.parse(historyStatement.getAsObject().payload_json));
      }
    } finally {
      historyStatement.free();
    }
    return { activeSessions, sessionHistory };
  }

  async initializeFromLegacy(payload = {}) {
    await this.readyPromise;
    const migrationResult = this.historyDb.exec("SELECT value FROM app_metadata WHERE key = 'local_storage_migrated'");
    const alreadyMigrated = migrationResult[0]?.values?.[0]?.[0] === 'true';
    if (!alreadyMigrated) {
      // Migrate from localStorage into the split databases.
      transactionOn(this.activeDb, this.activeDbPath, () => {
        this.replaceActiveSessions(payload.activeSessions);
      });
      transactionOn(this.historyDb, this.historyDbPath, () => {
        (Array.isArray(payload.sessionHistory) ? payload.sessionHistory : []).forEach((entry) =>
          this.insertHistoryEntry(entry)
        );
        this.historyDb.run(
          "INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('local_storage_migrated', 'true')"
        );
      });
    }
    return this.getSnapshot();
  }

  async saveActiveSessions(sessions) {
    await this.readyPromise;
    // Only the small active-sessions database is written — the history
    // database is untouched, so the 60-second heartbeat no longer
    // re-serializes the entire session history.
    transactionOn(this.activeDb, this.activeDbPath, () => this.replaceActiveSessions(sessions));
    return true;
  }

  async settleSession(entry, activeSessions) {
    await this.readyPromise;
    // Write the history entry to the history database...
    const inserted = transactionOn(this.historyDb, this.historyDbPath, () => this.insertHistoryEntry(entry));
    // ...and update active sessions in their own database.
    transactionOn(this.activeDb, this.activeDbPath, () => this.replaceActiveSessions(activeSessions));
    return { inserted };
  }

  countHistoryRows() {
    const result = this.historyDb.exec('SELECT COUNT(*) AS n FROM session_history');
    return result[0]?.values?.[0]?.[0] ?? 0;
  }

  /**
   * Whole-history replace (renderer merge/sanitize writes). Guarded: a
   * renderer bug passing an empty or drastically truncated array must not
   * destroy the on-disk record, so suspicious replaces are refused unless
   * the caller passes { force: true }. Accepted replaces take a once-a-day
   * 'pre-replace' backup first.
   */
  async replaceHistory(history, { force = false } = {}) {
    await this.readyPromise;
    const incoming = Array.isArray(history) ? history.length : 0;
    const existing = this.countHistoryRows();
    const wipesExisting = incoming === 0 && existing > 0;
    const shrinksByHalf = existing >= 20 && incoming < existing * 0.5;
    if (!force && (wipesExisting || shrinksByHalf)) {
      console.warn(
        `SessionDatabase: rejected session history replace (${existing} rows -> ${incoming}); pass { force: true } to override.`
      );
      return { ok: false, rejected: true, existing, incoming };
    }
    await this.backupHistory('pre-replace');
    transactionOn(this.historyDb, this.historyDbPath, () => {
      this.historyDb.run('DELETE FROM session_history');
      (Array.isArray(history) ? history : []).forEach((entry) => this.insertHistoryEntry(entry));
    });
    return { ok: true, existing, incoming };
  }

  /**
   * Copy the history DB into userData/session-backups/. At most one backup
   * per day per reason (files are date-stamped); prunes to the newest 10.
   * Never throws — backup failure must not break session writes.
   */
  async backupHistory(reason = 'manual') {
    try {
      if (!fs.existsSync(this.historyDbPath)) return { ok: false, skipped: 'no-db' };
      const date = new Date().toISOString().slice(0, 10);
      const safeReason =
        String(reason)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') || 'manual';
      const fileName = `session-history-${date}-${safeReason}.sqlite`;
      fs.mkdirSync(this.backupDirPath, { recursive: true });
      const destination = path.join(this.backupDirPath, fileName);
      const skipped = fs.existsSync(destination);
      if (!skipped) fs.copyFileSync(this.historyDbPath, destination);
      this.pruneBackups();
      return { ok: true, skipped, file: fileName, path: destination };
    } catch (error) {
      console.error('SessionDatabase: history backup failed:', error);
      return { ok: false, error: String(error?.message || error) };
    }
  }

  pruneBackups(keep = MAX_BACKUPS) {
    try {
      if (!fs.existsSync(this.backupDirPath)) return;
      const files = fs
        .readdirSync(this.backupDirPath)
        .filter((name) => BACKUP_FILE_PATTERN.test(name))
        .map((name) => ({
          name,
          mtime: fs.statSync(path.join(this.backupDirPath, name)).mtimeMs,
        }))
        .sort((a, b) => b.mtime - a.mtime || b.name.localeCompare(a.name));
      files.slice(keep).forEach((entry) => {
        try {
          fs.unlinkSync(path.join(this.backupDirPath, entry.name));
        } catch (error) {
          console.error('SessionDatabase: failed to prune backup:', error);
        }
      });
    } catch (error) {
      console.error('SessionDatabase: backup pruning failed:', error);
    }
  }

  /**
   * List rolling backups, newest-friendly ordering (file name sorts by date).
   * sessionCount is read through sql.js; corrupt files report null.
   */
  async listBackups() {
    await this.readyPromise;
    try {
      if (!fs.existsSync(this.backupDirPath)) return [];
      const names = fs
        .readdirSync(this.backupDirPath)
        .filter((name) => BACKUP_FILE_PATTERN.test(name))
        .sort();
      const backups = [];
      for (const name of names) {
        const filePath = path.join(this.backupDirPath, name);
        const stat = fs.statSync(filePath);
        let sessionCount = null;
        try {
          const db = new this.SQL.Database(fs.readFileSync(filePath));
          try {
            const result = db.exec('SELECT COUNT(*) AS n FROM session_history');
            sessionCount = result[0]?.values?.[0]?.[0] ?? 0;
          } finally {
            db.close();
          }
        } catch {
          sessionCount = null;
        }
        backups.push({
          file: name,
          path: filePath,
          sizeBytes: stat.size,
          createdAt: stat.mtime.toISOString(),
          sessionCount,
        });
      }
      return backups;
    } catch (error) {
      console.error('SessionDatabase: listing backups failed:', error);
      return [];
    }
  }

  /**
   * Restore the history DB from a named backup. The name must match an entry
   * from listBackups() (no path traversal). A 'pre-restore' safety copy of
   * the current file is taken first, then the file is swapped and reopened.
   */
  async restoreBackup(fileName) {
    await this.readyPromise;
    try {
      const backups = await this.listBackups();
      const match = backups.find((backup) => backup.file === fileName);
      if (!match) return { ok: false, error: 'unknown-backup' };
      await this.backupHistory('pre-restore');
      try {
        this.historyDb.close();
      } catch {
        // Already closed/never opened — the file swap below still applies.
      }
      fs.copyFileSync(match.path, this.historyDbPath);
      this.historyDb = await openDatabase(this.SQL, this.historyDbPath, HISTORY_SCHEMA_SQL);
      return { ok: true, snapshot: this.getSnapshot() };
    } catch (error) {
      console.error('SessionDatabase: backup restore failed:', error);
      return { ok: false, error: String(error?.message || error) };
    }
  }

  async clear() {
    await this.readyPromise;
    // Explicit user action — a direct DELETE, deliberately not routed
    // through replaceHistory's shrink guards.
    transactionOn(this.activeDb, this.activeDbPath, () => {
      this.activeDb.run('DELETE FROM active_sessions');
    });
    transactionOn(this.historyDb, this.historyDbPath, () => {
      this.historyDb.run('DELETE FROM session_history');
    });
    return true;
  }
}

module.exports = SessionDatabase;
