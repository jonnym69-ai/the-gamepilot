/**
 * GameCurationService - Central librarian feature hub
 * Handles collections, hidden games, completion history, notes,
 * duplicate detection, cover art override, session notes, and recently-added tracking.
 */

import StorageService from './StorageService';

const KEYS = {
  collections: 'userCollectionsV1',
  hidden: 'hiddenGamesV1',
  completion: 'completionHistoryV1',
  notes: 'librarianNotesV1',
  coverArt: 'coverArtOverridesV1',
  moodOverride: 'moodOverridesV1',
  sessionNotes: 'sessionNotesV1',
  duplicates: 'duplicateMergesV1',
  scanTimestamps: 'scanTimestampsV1',
  playedElsewhere: 'playedElsewhereV1'
};

const DEFAULT_COLLECTIONS = [
  { id: 'backlog', name: 'Backlog', color: '#ff6b35', locked: true },
  { id: 'playing', name: 'Playing', color: '#3dd9ff', locked: true },
  { id: 'completed', name: 'Completed', color: '#7ddc84', locked: true },
  { id: 'on-hold', name: 'On Hold', color: '#f0c040', locked: true },
  { id: 'abandoned', name: 'Abandoned', color: '#888888', locked: true }
];

const COMPLETION_STATUSES = ['not-started', 'playing', 'beaten', 'completed', '100%', 'abandoned'];

// ---------- Collections ----------

function getCollections() {
  const stored = StorageService.get(KEYS.collections, null);
  if (Array.isArray(stored)) return stored;
  StorageService.set(KEYS.collections, DEFAULT_COLLECTIONS);
  return [...DEFAULT_COLLECTIONS];
}

function saveCollections(collections) {
  StorageService.set(KEYS.collections, collections);
}

function createCollection(name, color = '#ff6b35') {
  const collections = getCollections();
  const id = `custom-${Date.now()}`;
  collections.push({ id, name, color, locked: false });
  saveCollections(collections);
  return id;
}

function deleteCollection(collectionId) {
  const collections = getCollections().filter((c) => c.id !== collectionId || c.locked);
  saveCollections(collections);
  const assignments = StorageService.get('collectionAssignmentsV1', {});
  Object.keys(assignments).forEach((gameKey) => {
    assignments[gameKey] = (assignments[gameKey] || []).filter((id) => id !== collectionId);
    if (assignments[gameKey].length === 0) delete assignments[gameKey];
  });
  StorageService.set('collectionAssignmentsV1', assignments);
}

function getGameCollections(gameKey) {
  const assignments = StorageService.get('collectionAssignmentsV1', {});
  return assignments[gameKey] || [];
}

function setGameCollections(gameKey, collectionIds) {
  const assignments = StorageService.get('collectionAssignmentsV1', {});
  if (collectionIds.length === 0) {
    delete assignments[gameKey];
  } else {
    assignments[gameKey] = collectionIds;
  }
  StorageService.set('collectionAssignmentsV1', assignments);
}

function addGameToCollection(gameKey, collectionId) {
  const current = getGameCollections(gameKey);
  if (!current.includes(collectionId)) {
    setGameCollections(gameKey, [...current, collectionId]);
  }
}

function removeGameFromCollection(gameKey, collectionId) {
  const current = getGameCollections(gameKey);
  setGameCollections(gameKey, current.filter((id) => id !== collectionId));
}

// ---------- Hidden Games ----------

function getHiddenGames() {
  return new Set(StorageService.get(KEYS.hidden, []));
}

function setHiddenGames(hiddenSet) {
  StorageService.set(KEYS.hidden, Array.from(hiddenSet));
}

function isGameHidden(gameKey) {
  return getHiddenGames().has(gameKey);
}

function toggleHiddenGame(gameKey) {
  const hidden = getHiddenGames();
  if (hidden.has(gameKey)) {
    hidden.delete(gameKey);
  } else {
    hidden.add(gameKey);
  }
  setHiddenGames(hidden);
  return hidden.has(gameKey);
}

// ---------- Played Elsewhere ----------

function getPlayedElsewhere() {
  return StorageService.get(KEYS.playedElsewhere, {});
}

function isPlayedElsewhere(gameKey) {
  return Boolean(getPlayedElsewhere()[gameKey]);
}

function setPlayedElsewhere(gameKey, value) {
  const all = getPlayedElsewhere();
  if (value) {
    all[gameKey] = Date.now();
  } else {
    delete all[gameKey];
  }
  StorageService.set(KEYS.playedElsewhere, all);
}

function togglePlayedElsewhere(gameKey) {
  const next = !isPlayedElsewhere(gameKey);
  setPlayedElsewhere(gameKey, next);
  return next;
}

// ---------- Completion History ----------

function getCompletionHistory() {
  return StorageService.get(KEYS.completion, {});
}

function getGameCompletion(gameKey) {
  const history = getCompletionHistory();
  return history[gameKey] || { status: 'not-started', history: [] };
}

function setGameCompletion(gameKey, status, note = '') {
  if (!COMPLETION_STATUSES.includes(status)) return;
  const history = getCompletionHistory();
  const entry = history[gameKey] || { status: 'not-started', history: [] };
  const oldStatus = entry.status;
  entry.status = status;
  entry.history.push({
    status,
    previousStatus: oldStatus,
    timestamp: Date.now(),
    note
  });
  history[gameKey] = entry;
  StorageService.set(KEYS.completion, history);

  // Auto-sync to legacy completedGames list for backward compatibility
  const completedGames = StorageService.get('completedGames', []);
  const legacyIndex = completedGames.findIndex((g) => g.name === gameKey);
  if (status === 'completed' || status === '100%') {
    if (legacyIndex === -1) {
      completedGames.push({ name: gameKey, completedAt: Date.now() });
    }
  } else {
    if (legacyIndex !== -1) {
      completedGames.splice(legacyIndex, 1);
    }
  }
  StorageService.set('completedGames', completedGames);
}

// ---------- Notes ----------

function getGameNotes(gameKey) {
  const all = StorageService.get(KEYS.notes, {});
  return all[gameKey] || '';
}

function setGameNotes(gameKey, text) {
  const all = StorageService.get(KEYS.notes, {});
  if (!text || !text.trim()) {
    delete all[gameKey];
  } else {
    all[gameKey] = text.trim();
  }
  StorageService.set(KEYS.notes, all);
}

// ---------- Cover Art Override ----------

function getCoverArtOverride(gameKey) {
  const all = StorageService.get(KEYS.coverArt, {});
  return all[gameKey] || null;
}

function setCoverArtOverride(gameKey, url) {
  const all = StorageService.get(KEYS.coverArt, {});
  if (!url || !url.trim()) {
    delete all[gameKey];
  } else {
    all[gameKey] = url.trim();
  }
  StorageService.set(KEYS.coverArt, all);
}

// ---------- Mood Override ----------

function getMoodOverride(gameKey) {
  const all = StorageService.get(KEYS.moodOverride, {});
  return all[gameKey] || null;
}

function setMoodOverride(gameKey, mood) {
  const all = StorageService.get(KEYS.moodOverride, {});
  if (!mood || !mood.trim()) {
    delete all[gameKey];
  } else {
    all[gameKey] = mood.trim();
  }
  StorageService.set(KEYS.moodOverride, all);
}

// ---------- Session Notes ----------

function getSessionNotes(gameKey) {
  const all = StorageService.get(KEYS.sessionNotes, {});
  return all[gameKey] || [];
}

function addSessionNote(gameKey, text) {
  if (!text || !text.trim()) return;
  const all = StorageService.get(KEYS.sessionNotes, {});
  const list = all[gameKey] || [];
  list.unshift({ text: text.trim(), timestamp: Date.now() });
  all[gameKey] = list.slice(0, 50); // keep last 50
  StorageService.set(KEYS.sessionNotes, all);
}

function deleteSessionNote(gameKey, timestamp) {
  const all = StorageService.get(KEYS.sessionNotes, {});
  const list = all[gameKey] || [];
  all[gameKey] = list.filter((n) => n.timestamp !== timestamp);
  StorageService.set(KEYS.sessionNotes, all);
}

// ---------- Duplicate Detection ----------

function normalizeForDedup(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[\u00ae\u2122\u00a9]/g, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*:\s*/g, ' ')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findDuplicates(library) {
  const groups = new Map();
  (library || []).forEach((game) => {
    const key = normalizeForDedup(game.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(game);
  });
  return Array.from(groups.values()).filter((g) => g.length > 1);
}

function getDuplicateMerges() {
  return StorageService.get(KEYS.duplicates, {});
}

function mergeDuplicateGames(primaryKey, duplicateKeys) {
  const merges = getDuplicateMerges();
  merges[primaryKey] = duplicateKeys;
  StorageService.set(KEYS.duplicates, merges);
}

function getMergedGameKey(gameName) {
  const merges = getDuplicateMerges();
  const normalized = normalizeForDedup(gameName);
  for (const [primary, duplicates] of Object.entries(merges)) {
    if (normalizeForDedup(primary) === normalized) return primary;
    if (duplicates.some((d) => normalizeForDedup(d) === normalized)) return primary;
  }
  return gameName;
}

function isDuplicateMerged(gameName) {
  const merges = getDuplicateMerges();
  const normalized = normalizeForDedup(gameName);
  return Object.entries(merges).some(
    ([primary, duplicates]) =>
      normalizeForDedup(primary) === normalized ||
      duplicates.some((d) => normalizeForDedup(d) === normalized)
  );
}

// ---------- Recently Added ----------

function getScanTimestamps() {
  return StorageService.get(KEYS.scanTimestamps, {});
}

function recordGameSeen(gameKey) {
  const timestamps = getScanTimestamps();
  if (!timestamps[gameKey]) {
    timestamps[gameKey] = Date.now();
    StorageService.set(KEYS.scanTimestamps, timestamps);
  }
}

function getDateAdded(gameKey) {
  return getScanTimestamps()[gameKey] || null;
}

function isRecentlyAdded(gameKey, days = 30) {
  const added = getDateAdded(gameKey);
  if (!added) return false;
  return Date.now() - added < days * 24 * 60 * 60 * 1000;
}

// ---------- Enrichment helper ----------

function enrichGame(game) {
  if (!game || !game.name) return game;
  const key = game.name;
  const collections = getGameCollections(key);
  const completion = getGameCompletion(key);
  const notes = getGameNotes(key);
  const coverArt = getCoverArtOverride(key);
  const moodOverride = getMoodOverride(key);
  const sessionNotesList = getSessionNotes(key);
  const dateAdded = getDateAdded(key);
  const hidden = isGameHidden(key);
  const duplicatePrimary = getMergedGameKey(key);
  const playedElsewhere = isPlayedElsewhere(key);

  return {
    ...game,
    userCollections: collections,
    completionStatus: completion.status,
    completionHistory: completion.history,
    userNotes: notes,
    coverArtOverride: coverArt,
    moodOverride,
    sessionNotes: sessionNotesList,
    dateAdded,
    isHidden: hidden,
    isDuplicateMerged: duplicatePrimary !== key,
    duplicatePrimaryKey: duplicatePrimary,
    playedElsewhere
  };
}

function enrichLibrary(library) {
  return (library || []).map(enrichGame);
}

// ---------- Bulk operations ----------

function bulkAddToCollection(gameKeys, collectionId) {
  gameKeys.forEach((key) => addGameToCollection(key, collectionId));
}

function bulkRemoveFromCollection(gameKeys, collectionId) {
  gameKeys.forEach((key) => removeGameFromCollection(key, collectionId));
}

function bulkSetCompletion(gameKeys, status, note = '') {
  gameKeys.forEach((key) => setGameCompletion(key, status, note));
}

function bulkToggleHidden(gameKeys) {
  gameKeys.forEach((key) => toggleHiddenGame(key));
}

export const GameCurationService = {
  // Collections
  getCollections,
  createCollection,
  deleteCollection,
  getGameCollections,
  setGameCollections,
  addGameToCollection,
  removeGameFromCollection,
  // Hidden
  getHiddenGames,
  isGameHidden,
  toggleHiddenGame,
  // Completion
  getCompletionHistory,
  getGameCompletion,
  setGameCompletion,
  COMPLETION_STATUSES,
  // Notes
  getGameNotes,
  setGameNotes,
  // Cover art
  getCoverArtOverride,
  setCoverArtOverride,
  // Mood override
  getMoodOverride,
  setMoodOverride,
  // Session notes
  getSessionNotes,
  addSessionNote,
  deleteSessionNote,
  // Duplicates
  findDuplicates,
  getDuplicateMerges,
  mergeDuplicateGames,
  getMergedGameKey,
  isDuplicateMerged,
  // Played elsewhere
  getPlayedElsewhere,
  isPlayedElsewhere,
  setPlayedElsewhere,
  togglePlayedElsewhere,
  // Recently added
  recordGameSeen,
  getDateAdded,
  isRecentlyAdded,
  // Enrichment
  enrichGame,
  enrichLibrary,
  // Bulk
  bulkAddToCollection,
  bulkRemoveFromCollection,
  bulkSetCompletion,
  bulkToggleHidden
};
