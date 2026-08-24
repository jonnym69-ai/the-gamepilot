const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

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
    this.activeDb = null;
    this.historyDb = null;
    this.readyPromise = this.initialize();
  }

  async initialize() {
    const SQL = await initSqlJs({
      locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm')
    });

    // If the legacy single-file database exists, migrate its data into the
    // two new files, then rename it so we don't migrate again.
    if (fs.existsSync(this.legacyDbPath)) {
      await this.migrateFromLegacyDb(SQL);
    }

    this.activeDb = await openDatabase(SQL, this.activeDbPath, `
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS active_sessions (
        game_name TEXT PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        start_time TEXT NOT NULL,
        last_confirmed_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
    `);

    this.historyDb = await openDatabase(SQL, this.historyDbPath, `
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
    `);

    // Ensure schema is persisted for fresh databases.
    persistDatabase(this.activeDb, this.activeDbPath);
    persistDatabase(this.historyDb, this.historyDbPath);
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
      this.activeDb = await openDatabase(SQL, this.activeDbPath, `
        CREATE TABLE IF NOT EXISTS active_sessions (
          game_name TEXT PRIMARY KEY,
          session_id TEXT NOT NULL UNIQUE,
          start_time TEXT NOT NULL,
          last_confirmed_at TEXT NOT NULL,
          payload_json TEXT NOT NULL
        );
      `);
      this.historyDb = await openDatabase(SQL, this.historyDbPath, `
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
      `);

      // Populate active sessions.
      transactionOn(this.activeDb, this.activeDbPath, () => {
        this.activeDb.run('DELETE FROM active_sessions');
        const stmt = this.activeDb.prepare(
          'INSERT INTO active_sessions (game_name, session_id, start_time, last_confirmed_at, payload_json) VALUES (?, ?, ?, ?, ?)'
        );
        try {
          Object.entries(activeSessions).forEach(([gameName, session]) => {
            if (!session?.sessionId || !session?.startTime) return;
            stmt.run([gameName, session.sessionId, session.startTime, session.lastConfirmedAt || session.startTime, JSON.stringify(session)]);
          });
        } finally {
          stmt.free();
        }
      });

      // Populate session history.
      transactionOn(this.historyDb, this.historyDbPath, () => {
        this.historyDb.run('DELETE FROM session_history');
        sessionHistory.forEach((entry) => this.insertHistoryEntry(entry));
        this.historyDb.run("INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('local_storage_migrated', 'true')");
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
          JSON.stringify(session)
        ]);
      });
    } finally {
      statement.free();
    }
  }

  insertHistoryEntry(entry) {
    if (!entry?.sessionId || !entry?.gameName) return false;
    this.historyDb.run(`
      INSERT OR IGNORE INTO session_history (
        session_id, game_name, game_id, started_at, ended_at, playtime_minutes, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      entry.sessionId,
      entry.gameName,
      entry.gameId == null ? null : String(entry.gameId),
      entry.startTime || null,
      entry.endTime || entry.timestamp || new Date().toISOString(),
      Math.max(0, Math.round(Number(entry.playtimeMinutes) || 0)),
      JSON.stringify(entry)
    ]);
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
    const historyStatement = this.historyDb.prepare('SELECT payload_json FROM session_history ORDER BY ended_at ASC, rowid ASC');
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
        (Array.isArray(payload.sessionHistory) ? payload.sessionHistory : []).forEach((entry) => this.insertHistoryEntry(entry));
        this.historyDb.run("INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('local_storage_migrated', 'true')");
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

  async replaceHistory(history) {
    await this.readyPromise;
    transactionOn(this.historyDb, this.historyDbPath, () => {
      this.historyDb.run('DELETE FROM session_history');
      (Array.isArray(history) ? history : []).forEach((entry) => this.insertHistoryEntry(entry));
    });
    return true;
  }

  async clear() {
    await this.readyPromise;
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
