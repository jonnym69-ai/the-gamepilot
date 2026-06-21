import StorageService from './StorageService';

const RATINGS_STORAGE_KEY = 'gameRatings';
const DEFAULT_TAGS = [
  'Masterpiece',
  'Replay forever',
  'Great story',
  'Chill',
  'Hardcore',
  'Short & sweet',
  'One-and-done',
  'Overrated',
  'Better with friends',
  'Technical showcase'
];

export class GameRatingService {
  static getAllRatings() {
    return StorageService.get(RATINGS_STORAGE_KEY, {});
  }

  static getRating(gameId) {
    if (!gameId) return null;
    const all = this.getAllRatings();
    return all[gameId] || null;
  }

  static hasRating(gameId) {
    const rating = this.getRating(gameId);
    return rating && typeof rating.value === 'number' && rating.value > 0;
  }

  static setRating(gameId, { value = null, wouldReplay = null, tags = [], notes = '' } = {}) {
    if (!gameId) return null;
    const all = this.getAllRatings();
    const existing = all[gameId] || {};
    const next = {
      ...existing,
      gameId,
      value: typeof value === 'number' && value >= 0 && value <= 10 ? value : existing.value,
      wouldReplay: typeof wouldReplay === 'boolean' ? wouldReplay : existing.wouldReplay,
      tags: Array.isArray(tags) ? tags.filter(Boolean) : existing.tags || [],
      notes: typeof notes === 'string' ? notes : existing.notes || '',
      updatedAt: new Date().toISOString(),
      createdAt: existing.createdAt || new Date().toISOString()
    };

    if (value === null && wouldReplay === null && tags.length === 0 && !notes) {
      return next;
    }

    StorageService.set(RATINGS_STORAGE_KEY, { ...all, [gameId]: next });
    return next;
  }

  static deleteRating(gameId) {
    if (!gameId) return;
    const all = this.getAllRatings();
    delete all[gameId];
    StorageService.set(RATINGS_STORAGE_KEY, all);
  }

  static getRatingForGame(game) {
    const gameId = String(game?.appid || game?.name || '');
    return gameId ? this.getRating(gameId) : null;
  }

  static getAverageRating() {
    const all = this.getAllRatings();
    const rated = Object.values(all).filter((r) => typeof r.value === 'number' && r.value > 0);
    if (rated.length === 0) return 0;
    const sum = rated.reduce((acc, r) => acc + r.value, 0);
    return Number((sum / rated.length).toFixed(2));
  }

  static getTopRatedGames(limit = 10) {
    const all = this.getAllRatings();
    return Object.values(all)
      .filter((r) => typeof r.value === 'number' && r.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, limit)
      .map((r) => r.gameId);
  }

  static getWouldReplayGames() {
    const all = this.getAllRatings();
    return Object.values(all)
      .filter((r) => r.wouldReplay === true)
      .map((r) => r.gameId);
  }

  static getDefaultTags() {
    return [...DEFAULT_TAGS];
  }

  static getAllUniqueTags() {
    const all = this.getAllRatings();
    const tagSet = new Set(DEFAULT_TAGS);
    Object.values(all).forEach((r) => {
      (r.tags || []).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }

  static buildRatingSnapshot(game) {
    const rating = this.getRatingForGame(game);
    return {
      value: rating?.value || game?.userRating || 0,
      wouldReplay: rating?.wouldReplay ?? null,
      tags: rating?.tags || [],
      notes: rating?.notes || ''
    };
  }

  static exportRatings() {
    return this.getAllRatings();
  }

  static importRatings(ratings) {
    if (!ratings || typeof ratings !== 'object') return;
    StorageService.set(RATINGS_STORAGE_KEY, ratings);
  }
}
