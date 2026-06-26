import StorageService from './StorageService';

const CAPTAIN_LOG_KEY = 'captainLogEntries';

const generateId = () => `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export class CaptainLogService {
  static getAllEntries() {
    try {
      return StorageService.get(CAPTAIN_LOG_KEY, []);
    } catch {
      return [];
    }
  }

  static getEntriesForGame(gameName) {
    const all = this.getAllEntries();
    if (!gameName) return all;
    return all.filter(
      (entry) =>
        String(entry?.gameName || '').toLowerCase() ===
        String(gameName).toLowerCase()
    );
  }

  static getEntriesForSession(sessionTimestamp) {
    const all = this.getAllEntries();
    if (!sessionTimestamp) return [];
    const target = new Date(sessionTimestamp).getTime();
    return all.filter((entry) => {
      const entryTime = new Date(entry?.sessionTimestamp || entry?.createdAt).getTime();
      return Math.abs(entryTime - target) < 60000; // Within 1 minute
    });
  }

  static addEntry({
    gameName,
    gameId = null,
    sessionTimestamp = new Date().toISOString(),
    notes = '',
    mood = null,
    tags = [],
    rating = null
  }) {
    const all = this.getAllEntries();
    const entry = {
      id: generateId(),
      gameName: gameName || 'Unknown Game',
      gameId,
      sessionTimestamp: new Date(sessionTimestamp).toISOString(),
      notes: String(notes || '').trim(),
      mood: mood || null,
      tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
      rating: typeof rating === 'number' && rating >= 1 && rating <= 5 ? rating : null,
      createdAt: new Date().toISOString()
    };
    all.push(entry);
    StorageService.set(CAPTAIN_LOG_KEY, all);
    return entry;
  }

  static updateEntry(id, updates) {
    const all = this.getAllEntries();
    const index = all.findIndex((e) => e.id === id);
    if (index === -1) return null;
    all[index] = {
      ...all[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    StorageService.set(CAPTAIN_LOG_KEY, all);
    return all[index];
  }

  static deleteEntry(id) {
    const all = this.getAllEntries();
    const filtered = all.filter((e) => e.id !== id);
    StorageService.set(CAPTAIN_LOG_KEY, filtered);
    return filtered.length < all.length;
  }

  static getRecentEntries(limit = 10) {
    const all = this.getAllEntries();
    return all
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);
  }

  static getStats() {
    const all = this.getAllEntries();
    const gameCounts = {};
    const tagCounts = {};
    let totalRating = 0;
    let ratedCount = 0;

    all.forEach((entry) => {
      const name = entry.gameName;
      gameCounts[name] = (gameCounts[name] || 0) + 1;
      (entry.tags || []).forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
      if (entry.rating) {
        totalRating += entry.rating;
        ratedCount++;
      }
    });

    return {
      totalEntries: all.length,
      uniqueGames: Object.keys(gameCounts).length,
      topGames: Object.entries(gameCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
      topTags: Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count })),
      averageRating: ratedCount > 0 ? Number((totalRating / ratedCount).toFixed(1)) : null
    };
  }

  static hasEntryForSession(sessionTimestamp) {
    return this.getEntriesForSession(sessionTimestamp).length > 0;
  }
}
