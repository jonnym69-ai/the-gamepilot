import StorageService from './StorageService';

const USER_COLLECTIONS_KEY = 'userRuleCollections';

const generateId = () => `uc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const daysSince = (timestamp) => {
  if (!timestamp) return Infinity;
  return (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
};

const getLastPlayedTimestamp = (game) => {
  const val = game?.last_played;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const p = Date.parse(val);
    return Number.isNaN(p) ? 0 : p;
  }
  return 0;
};

const getGenreList = (game) => {
  return Array.isArray(game?.genres) ? game.genres.filter(Boolean) : [];
};

export class UserRuleCollectionService {
  static getAllCollections() {
    try {
      return StorageService.get(USER_COLLECTIONS_KEY, []);
    } catch {
      return [];
    }
  }

  static createCollection({
    name,
    description = '',
    rules = {},
    color = '#ff6b35',
    icon = 'folder'
  }) {
    const all = this.getAllCollections();
    const collection = {
      id: generateId(),
      name: name || 'My Collection',
      description,
      rules,
      color,
      icon,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isUserCreated: true
    };
    all.push(collection);
    StorageService.set(USER_COLLECTIONS_KEY, all);
    return collection;
  }

  static updateCollection(id, updates) {
    const all = this.getAllCollections();
    const index = all.findIndex((c) => c.id === id);
    if (index === -1) return null;
    all[index] = {
      ...all[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    StorageService.set(USER_COLLECTIONS_KEY, all);
    return all[index];
  }

  static deleteCollection(id) {
    const all = this.getAllCollections();
    const filtered = all.filter((c) => c.id !== id);
    StorageService.set(USER_COLLECTIONS_KEY, filtered);
    return filtered.length < all.length;
  }

  static evaluateCollection(collection, library = []) {
    if (!collection?.rules || !Array.isArray(library)) {
      return { ...collection, games: [] };
    }

    const rules = collection.rules;
    const games = library.filter((game) => {
      if (!game) return false;

      // Genre filter
      if (rules.genres?.length > 0) {
        const gameGenres = getGenreList(game);
        const hasGenre = rules.genres.some((g) =>
          gameGenres.some((gg) => gg.toLowerCase() === g.toLowerCase())
        );
        if (!hasGenre) return false;
      }

      // Mood filter
      if (rules.moods?.length > 0) {
        const gameMood = game?.mood || '';
        const hasMood = rules.moods.some((m) =>
          gameMood.toLowerCase() === m.toLowerCase()
        );
        if (!hasMood) return false;
      }

      // Platform filter
      if (rules.platforms?.length > 0) {
        const gamePlatform = String(game?.platform || game?.brandPlatform || '').toLowerCase();
        const hasPlatform = rules.platforms.some((p) =>
          gamePlatform.includes(p.toLowerCase())
        );
        if (!hasPlatform) return false;
      }

      // Completion status
      if (rules.completionStatus) {
        const status = game?.completionStatus || game?.status || '';
        const isComplete = status === 'completed' || status === '100%';
        const isPlaying = status === 'playing' || status === 'in-progress';
        const isBacklog = !status || status === 'backlog' || status === 'unplayed';

        if (rules.completionStatus === 'completed' && !isComplete) return false;
        if (rules.completionStatus === 'playing' && !isPlaying) return false;
        if (rules.completionStatus === 'backlog' && !isBacklog) return false;
        if (rules.completionStatus === 'uncompleted' && isComplete) return false;
      }

      // Playtime range
      const timePlayed = Number(game?.time_played || 0);
      if (rules.minPlaytime !== undefined && rules.minPlaytime !== null) {
        if (timePlayed < Number(rules.minPlaytime)) return false;
      }
      if (rules.maxPlaytime !== undefined && rules.maxPlaytime !== null) {
        if (timePlayed > Number(rules.maxPlaytime)) return false;
      }

      // Session count range
      const sessions = Number(game?.launch_count || game?.sessions || 0);
      if (rules.minSessions !== undefined && rules.minSessions !== null) {
        if (sessions < Number(rules.minSessions)) return false;
      }
      if (rules.maxSessions !== undefined && rules.maxSessions !== null) {
        if (sessions > Number(rules.maxSessions)) return false;
      }

      // Last played
      if (rules.lastPlayedDaysAgo !== undefined && rules.lastPlayedDaysAgo !== null) {
        const days = daysSince(getLastPlayedTimestamp(game));
        if (days > Number(rules.lastPlayedDaysAgo)) return false;
      }

      // Never played
      if (rules.neverPlayed) {
        if (timePlayed > 0 || sessions > 0 || getLastPlayedTimestamp(game) > 0) {
          return false;
        }
      }

      return true;
    });

    return {
      ...collection,
      title: collection.name,
      subtitle: collection.description || `${games.length} games matched`,
      games,
      relevanceScore: 50 + Math.min(games.length, 30)
    };
  }

  static evaluateAllCollections(library = []) {
    const userCollections = this.getAllCollections();
    const presets = this.getPresetRules().map((p) => ({ ...p, isUserCreated: false, isPreset: true }));
    const all = [...presets, ...userCollections];
    return all
      .map((c) => this.evaluateCollection(c, library))
      .filter((c) => c.games.length > 0)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }

  static getPresetRules() {
    return [
      {
        name: 'Comfort Zone',
        description: 'Games you keep coming back to',
        rules: { minSessions: 3 },
        color: '#f472b6',
        icon: 'heart'
      },
      {
        name: 'Weekend Warriors',
        description: 'Long-session games you have not played recently',
        rules: { minPlaytime: 180, lastPlayedDaysAgo: 14 },
        color: '#f87171',
        icon: 'calendar'
      },
      {
        name: 'Quick Hits',
        description: 'Short games for busy days',
        rules: { maxPlaytime: 120, neverPlayed: false },
        color: '#22d3ee',
        icon: 'zap'
      },
      {
        name: 'The Pile of Shame',
        description: 'Owned but never launched',
        rules: { neverPlayed: true },
        color: '#a78bfa',
        icon: 'archive'
      },
      {
        name: 'RPG Reserves',
        description: 'Your unplayed RPGs',
        rules: { genres: ['RPG'], neverPlayed: true },
        color: '#818cf8',
        icon: 'shield'
      },
      {
        name: 'Action Backlog',
        description: 'Action games waiting for you',
        rules: { genres: ['Action'], completionStatus: 'backlog' },
        color: '#fb923c',
        icon: 'swords'
      }
    ];
  }
}
