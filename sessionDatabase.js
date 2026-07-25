const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

class SessionDatabase {
  constructor(userDataPath) {
    this.databasePath = path.join(userDataPath, 'gamepilot-sessions.sqlite');
    this.database = null;
    this.readyPromise = this.initialize();
  }

  async initialize() {
    const SQL = await initSqlJs({
      locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm')
    });
    const existingData = fs.existsSync(this.databasePath)
      ? fs.readFileSync(this.databasePath)
      : null;
    this.database = existingData?.length ? new SQL.Database(existingData) : new SQL.Database();
    this.database.run(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS active_sessions (
        game_name TEXT PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        start_time TEXT NOT NULL,
        last_confirmed_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );
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
    this.persist();
  }

  persist() {
    const temporaryPath = `${this.databasePath}.tmp`;
    fs.writeFileSync(temporaryPath, Buffer.from(this.database.export()));
    fs.renameSync(temporaryPath, this.databasePath);
  }

  transaction(callback) {
    this.database.run('BEGIN IMMEDIATE TRANSACTION');
    try {
      const result = callback();
      this.database.run('COMMIT');
      this.persist();
      return result;
    } catch (error) {
      this.database.run('ROLLBACK');
      throw error;
    }
  }

  replaceActiveSessions(sessions = {}) {
    const safeSessions = sessions && typeof sessions === 'object' && !Array.isArray(sessions) ? sessions : {};
    this.database.run('DELETE FROM active_sessions');
    const statement = this.database.prepare(`
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
    this.database.run(`
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
    return this.database.getRowsModified() > 0;
  }

  getSnapshot() {
    const activeSessions = {};
    const activeStatement = this.database.prepare('SELECT game_name, payload_json FROM active_sessions');
    try {
      while (activeStatement.step()) {
        const row = activeStatement.getAsObject();
        activeSessions[row.game_name] = JSON.parse(row.payload_json);
      }
    } finally {
      activeStatement.free();
    }

    const sessionHistory = [];
    const historyStatement = this.database.prepare('SELECT payload_json FROM session_history ORDER BY ended_at ASC, rowid ASC');
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
    const migrationResult = this.database.exec("SELECT value FROM app_metadata WHERE key = 'local_storage_migrated'");
    const alreadyMigrated = migrationResult[0]?.values?.[0]?.[0] === 'true';
    if (!alreadyMigrated) {
      this.transaction(() => {
        this.replaceActiveSessions(payload.activeSessions);
        (Array.isArray(payload.sessionHistory) ? payload.sessionHistory : []).forEach((entry) => this.insertHistoryEntry(entry));
        this.database.run("INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('local_storage_migrated', 'true')");
      });
    }
    return this.getSnapshot();
  }

  async saveActiveSessions(sessions) {
    await this.readyPromise;
    this.transaction(() => this.replaceActiveSessions(sessions));
    return true;
  }

  async settleSession(entry, activeSessions) {
    await this.readyPromise;
    return this.transaction(() => {
      const inserted = this.insertHistoryEntry(entry);
      this.replaceActiveSessions(activeSessions);
      return { inserted };
    });
  }

  async replaceHistory(history) {
    await this.readyPromise;
    this.transaction(() => {
      this.database.run('DELETE FROM session_history');
      (Array.isArray(history) ? history : []).forEach((entry) => this.insertHistoryEntry(entry));
    });
    return true;
  }

  async clear() {
    await this.readyPromise;
    this.transaction(() => {
      this.database.run('DELETE FROM active_sessions');
      this.database.run('DELETE FROM session_history');
    });
    return true;
  }
}

module.exports = SessionDatabase;
