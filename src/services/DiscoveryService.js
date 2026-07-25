import StorageService from './StorageService';
import { UserBehaviorProfile } from './UserBehaviorProfile';

// IGDB API Configuration
const IGDB_BASE_URL = 'https://api.igdb.com/v4';
const IGDB_CLIENT_ID_KEY = 'igdbClientId';
const IGDB_ACCESS_TOKEN_KEY = 'igdbAccessToken';

// Cache configuration
const DISCOVERY_CACHE_KEY = 'discoveryCacheV3';
const DISCOVERY_CACHE_TTL = 1000 * 60 * 60 * 4; // 4 hours
const WISHLIST_KEY = 'discoveryWishlistV1';
const PRICE_TRACKING_KEY = 'discoveryPriceTrackingV1';

// Mood → IGDB theme keywords mapping
const MOOD_THEME_MAP = Object.freeze({
  Relaxed: ['relaxing', 'cozy', 'atmospheric', 'casual'],
  Social: ['multiplayer', 'co-op', 'cooperative', 'party'],
  Creative: ['sandbox', 'building', 'crafting', 'creative', 'modding'],
  Focused: ['tactical', 'strategic', 'challenging', 'puzzle', 'difficult', 'rpg'],
  Competitive: ['competitive', 'ranked', 'esports', 'pvp', 'arena']
});

// Genre → IGDB genre IDs
const GENRE_ID_MAP = Object.freeze({
  Strategy: 15,
  RPG: 12,
  Action: 4,
  Shooter: 5,
  FPS: 5,
  Horror: 31,
  Adventure: 31,
  Simulation: 13,
  Sports: 14,
  Racing: 10,
  Puzzle: 9,
  Fighting: 4,
  MOBA: 36,
  Indie: 32,
  Sandbox: 13,
  Survival: 31,
  'Visual Novel': 34,
  Platformer: 8,
  Management: 15,
  Exploration: 31,
  MMO: 12
});

// Normalize a game name for fuzzy comparison
const normalizeName = (name) => {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/[:\-_–—]/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(i{1,3}|iv|v|vi|vii|viii|ix|x)\b/g, (m) => {
      const map = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' };
      return map[m] || m;
    })
    .replace(/\b(\d+)(st|nd|rd|th)\b/g, '$1')
    .replace(/(definitive|goty|game of the year|complete|ultimate|enhanced|remastered|edition|hd|collection)\b/g, '')
    .trim();
};

// Check if a demo game matches any library entry by fuzzy name
const isGameInLibrary = (gameName, libraryEntries) => {
  const demoNorm = normalizeName(gameName);
  if (!demoNorm) return false;
  for (const entry of libraryEntries) {
    const libNorm = normalizeName(entry.name || entry.title);
    if (!libNorm) continue;
    // Direct containment check in either direction
    if (libNorm.includes(demoNorm) || demoNorm.includes(libNorm)) return true;
    // Word overlap for longer titles (80% of words match)
    const demoWords = demoNorm.split(' ').filter(w => w.length > 2);
    const libWords = libNorm.split(' ').filter(w => w.length > 2);
    if (demoWords.length >= 2 && libWords.length >= 2) {
      const shared = demoWords.filter(w => libWords.includes(w)).length;
      const minLen = Math.min(demoWords.length, libWords.length);
      if (shared / minLen >= 0.75) return true;
    }
  }
  return false;
};

// Session bucket → IGDB time_to_beat filters (approximate)
const SESSION_TIME_MAP = Object.freeze({
  '0-30': { min: 1, max: 10 },
  '30-60': { min: 5, max: 25 },
  '60-120': { min: 15, max: 50 },
  '120+': { min: 30, max: 200 }
});

// Demo game database — seeded with real games that map to personas
const DEMO_GAME_DATABASE = [
  // RPG / Creative
  { id: 'demo-1', name: 'Baldur\'s Gate 3', genres: ['RPG', 'Strategy'], themes: ['story rich', 'atmospheric', 'open world'], avgTime: 120, price: { steam: 5999, discount: 0 }, rating: 96, platforms: ['Steam', 'GOG'] },
  { id: 'demo-2', name: 'The Witcher 3: Wild Hunt', genres: ['RPG', 'Adventure'], themes: ['atmospheric', 'open world', 'story rich'], avgTime: 80, price: { steam: 2999, discount: 0 }, rating: 95, platforms: ['Steam', 'GOG'] },
  { id: 'demo-3', name: 'Disco Elysium', genres: ['RPG', 'Adventure'], themes: ['story rich', 'atmospheric', 'narrative'], avgTime: 30, price: { steam: 3499, discount: 50 }, rating: 94, platforms: ['Steam'] },
  { id: 'demo-4', name: 'Hades', genres: ['Action', 'RPG', 'Indie'], themes: ['challenging', 'atmospheric', 'roguelike'], avgTime: 25, price: { steam: 2499, discount: 0 }, rating: 93, platforms: ['Steam'] },
  { id: 'demo-5', name: 'Pentiment', genres: ['Adventure', 'RPG'], themes: ['narrative', 'story rich', 'atmospheric'], avgTime: 15, price: { steam: 1499, discount: 0 }, rating: 91, platforms: ['Steam', 'Xbox'] },

  // Strategy / Focused
  { id: 'demo-6', name: 'Civilization VI', genres: ['Strategy', 'Management'], themes: ['tactical', 'strategic', 'challenging'], avgTime: 60, price: { steam: 5999, discount: 75 }, rating: 88, platforms: ['Steam'] },
  { id: 'demo-7', name: 'XCOM 2', genres: ['Strategy', 'Action'], themes: ['tactical', 'challenging', 'strategic'], avgTime: 40, price: { steam: 3999, discount: 80 }, rating: 88, platforms: ['Steam'] },
  { id: 'demo-8', name: 'Into the Breach', genres: ['Strategy', 'Puzzle'], themes: ['tactical', 'challenging', 'puzzle'], avgTime: 12, price: { steam: 999, discount: 0 }, rating: 92, platforms: ['Steam'] },
  { id: 'demo-9', name: 'Crusader Kings III', genres: ['Strategy', 'Simulation'], themes: ['strategic', 'narrative', 'complex'], avgTime: 80, price: { steam: 4999, discount: 0 }, rating: 91, platforms: ['Steam'] },
  { id: 'demo-10', name: 'Factorio', genres: ['Simulation', 'Strategy', 'Management'], themes: ['building', 'strategic', 'complex'], avgTime: 50, price: { steam: 2999, discount: 0 }, rating: 96, platforms: ['Steam'] },

  // Action / Adrenaline
  { id: 'demo-11', name: 'Elden Ring', genres: ['Action', 'RPG'], themes: ['challenging', 'atmospheric', 'open world'], avgTime: 90, price: { steam: 5999, discount: 0 }, rating: 96, platforms: ['Steam'] },
  { id: 'demo-12', name: 'DOOM Eternal', genres: ['Action', 'Shooter', 'FPS'], themes: ['challenging', 'fast-paced', 'atmospheric'], avgTime: 20, price: { steam: 2999, discount: 70 }, rating: 93, platforms: ['Steam'] },
  { id: 'demo-13', name: 'Hollow Knight', genres: ['Action', 'Platformer', 'Indie'], themes: ['challenging', 'atmospheric', 'exploration'], avgTime: 35, price: { steam: 1499, discount: 0 }, rating: 94, platforms: ['Steam'] },
  { id: 'demo-14', name: 'Celeste', genres: ['Platformer', 'Indie', 'Action'], themes: ['challenging', 'pixel', 'atmospheric'], avgTime: 12, price: { steam: 1999, discount: 0 }, rating: 94, platforms: ['Steam'] },
  { id: 'demo-15', name: 'Sekiro: Shadows Die Twice', genres: ['Action', 'Adventure'], themes: ['challenging', 'atmospheric', 'narrative'], avgTime: 40, price: { steam: 4999, discount: 0 }, rating: 92, platforms: ['Steam'] },

  // Simulation / Creative
  { id: 'demo-16', name: 'Stardew Valley', genres: ['Simulation', 'RPG', 'Indie'], themes: ['cozy', 'relaxing', 'crafting', 'co-op'], avgTime: 60, price: { steam: 1499, discount: 0 }, rating: 97, platforms: ['Steam'] },
  { id: 'demo-17', name: 'Minecraft', genres: ['Sandbox', 'Adventure', 'Indie'], themes: ['sandbox', 'building', 'creative', 'co-op'], avgTime: 200, price: { steam: 2499, discount: 0 }, rating: 93, platforms: ['Microsoft Store'] },
  { id: 'demo-18', name: 'Planet Coaster', genres: ['Simulation', 'Management', 'Strategy'], themes: ['building', 'creative', 'sandbox'], avgTime: 30, price: { steam: 3499, discount: 75 }, rating: 87, platforms: ['Steam'] },
  { id: 'demo-19', name: 'The Sims 4', genres: ['Simulation', 'Sandbox'], themes: ['creative', 'sandbox', 'relaxing'], avgTime: 100, price: { steam: 0, discount: 0 }, rating: 75, platforms: ['Steam', 'EA App'] },
  { id: 'demo-20', name: 'Terraria', genres: ['Action', 'Adventure', 'Indie'], themes: ['sandbox', 'building', 'co-op', 'exploration'], avgTime: 50, price: { steam: 699, discount: 0 }, rating: 95, platforms: ['Steam'] },

  // Horror / Survival
  { id: 'demo-21', name: 'Resident Evil 4 (2023)', genres: ['Action', 'Horror', 'Adventure'], themes: ['atmospheric', 'tense', 'challenging'], avgTime: 18, price: { steam: 4999, discount: 0 }, rating: 93, platforms: ['Steam'] },
  { id: 'demo-22', name: 'Dead Space (2023)', genres: ['Action', 'Horror'], themes: ['atmospheric', 'tense', 'narrative'], avgTime: 16, price: { steam: 4999, discount: 0 }, rating: 91, platforms: ['Steam'] },
  { id: 'demo-23', name: 'Subnautica', genres: ['Adventure', 'Survival', 'Indie'], themes: ['atmospheric', 'exploration', 'survival'], avgTime: 35, price: { steam: 2499, discount: 0 }, rating: 93, platforms: ['Steam'] },
  { id: 'demo-24', name: 'Valheim', genres: ['Survival', 'Indie', 'Action'], themes: ['co-op', 'survival', 'building', 'exploration'], avgTime: 50, price: { steam: 1499, discount: 0 }, rating: 88, platforms: ['Steam'] },
  { id: 'demo-25', name: 'Phasmophobia', genres: ['Indie', 'Horror', 'Action'], themes: ['co-op', 'atmospheric', 'tense'], avgTime: 20, price: { steam: 1099, discount: 0 }, rating: 90, platforms: ['Steam'] },

  // Social / Multiplayer
  { id: 'demo-26', name: 'It Takes Two', genres: ['Action', 'Adventure', 'Indie'], themes: ['co-op', 'cooperative', 'narrative'], avgTime: 14, price: { steam: 2999, discount: 50 }, rating: 93, platforms: ['Steam'] },
  { id: 'demo-27', name: 'Portal 2', genres: ['Puzzle', 'Adventure'], themes: ['co-op', 'cooperative', 'puzzle', 'narrative'], avgTime: 10, price: { steam: 999, discount: 0 }, rating: 95, platforms: ['Steam'] },
  { id: 'demo-28', name: 'Deep Rock Galactic', genres: ['Action', 'Shooter', 'Indie'], themes: ['co-op', 'cooperative', 'exploration'], avgTime: 40, price: { steam: 2499, discount: 0 }, rating: 94, platforms: ['Steam'] },
  { id: 'demo-29', name: 'Overcooked! 2', genres: ['Simulation', 'Action', 'Indie'], themes: ['co-op', 'party', 'cooperative', 'challenging'], avgTime: 8, price: { steam: 1999, discount: 75 }, rating: 87, platforms: ['Steam'] },
  { id: 'demo-30', name: 'Left 4 Dead 2', genres: ['Action', 'Shooter'], themes: ['co-op', 'atmospheric', 'fast-paced'], avgTime: 12, price: { steam: 999, discount: 0 }, rating: 94, platforms: ['Steam'] },

  // Sports / Racing
  { id: 'demo-31', name: 'F1 23', genres: ['Racing', 'Simulation', 'Sports'], themes: ['competitive', 'realistic', 'challenging'], avgTime: 25, price: { steam: 4999, discount: 70 }, rating: 84, platforms: ['Steam'] },
  { id: 'demo-32', name: 'Forza Horizon 5', genres: ['Racing', 'Simulation'], themes: ['open world', 'exploration', 'atmospheric'], avgTime: 40, price: { steam: 4999, discount: 0 }, rating: 90, platforms: ['Steam', 'Microsoft Store'] },
  { id: 'demo-33', name: 'EA Sports FC 24', genres: ['Sports', 'Simulation'], themes: ['competitive', 'realistic', 'multiplayer'], avgTime: 50, price: { steam: 5999, discount: 0 }, rating: 78, platforms: ['Steam', 'EA App'] },
  { id: 'demo-34', name: 'Rocket League', genres: ['Sports', 'Racing', 'Action'], themes: ['competitive', 'multiplayer', 'fast-paced'], avgTime: 100, price: { steam: 0, discount: 0 }, rating: 89, platforms: ['Steam'] },
  { id: 'demo-35', name: 'Gran Turismo 7', genres: ['Racing', 'Simulation', 'Sports'], themes: ['realistic', 'competitive', 'atmospheric'], avgTime: 30, price: { steam: 0, discount: 0 }, rating: 88, platforms: ['PlayStation'] },

  // Puzzle / Focused
  { id: 'demo-36', name: 'Portal', genres: ['Puzzle', 'Adventure'], themes: ['puzzle', 'narrative', 'atmospheric'], avgTime: 4, price: { steam: 999, discount: 0 }, rating: 95, platforms: ['Steam'] },
  { id: 'demo-37', name: 'Tetris Effect: Connected', genres: ['Puzzle', 'Indie'], themes: ['relaxing', 'atmospheric', 'challenging'], avgTime: 15, price: { steam: 2999, discount: 0 }, rating: 92, platforms: ['Steam'] },
  { id: 'demo-38', name: 'The Witness', genres: ['Puzzle', 'Adventure', 'Indie'], themes: ['puzzle', 'atmospheric', 'exploration', 'challenging'], avgTime: 30, price: { steam: 2999, discount: 0 }, rating: 90, platforms: ['Steam'] },
  { id: 'demo-39', name: 'Baba Is You', genres: ['Puzzle', 'Indie'], themes: ['puzzle', 'challenging', 'creative'], avgTime: 25, price: { steam: 1299, discount: 0 }, rating: 92, platforms: ['Steam'] },
  { id: 'demo-40', name: 'Return of the Obra Dinn', genres: ['Puzzle', 'Adventure', 'Indie'], themes: ['puzzle', 'narrative', 'atmospheric'], avgTime: 12, price: { steam: 1799, discount: 0 }, rating: 93, platforms: ['Steam'] }
];

// Score a game against a persona snapshot
const scoreGameForPersona = (game, personaSnapshot) => {
  let score = 0;
  let reasons = [];

  if (!personaSnapshot || typeof personaSnapshot !== 'object') {
    return { score: 50, reasons: ['Broad recommendation'] };
  }

  const { dominantMood, dominantGenre, preferredSessionBucket, sessionPatternLabel } = personaSnapshot;

  // No persona signal yet (no history, seed, or library) — rank by acclaim so cards
  // still vary meaningfully instead of every title collapsing to a flat rating-only score.
  if (!dominantMood && !dominantGenre && !preferredSessionBucket) {
    const rating = Number(game.rating || 0);
    const base = rating > 0
      ? Math.round(Math.min(92, Math.max(55, (rating - 70) * 1.6 + 55)))
      : 60;
    return { score: base, reasons: [rating >= 90 ? 'Critically acclaimed' : 'Popular pick'] };
  }

  // Genre match (0-40 points)
  if (dominantGenre && game.genres.includes(dominantGenre)) {
    score += 40;
    reasons.push(`${dominantGenre} specialist pick`);
  } else if (dominantGenre) {
    // Partial genre match
    const genreOverlap = game.genres.filter(g => {
      const normalized = g.toLowerCase();
      return normalized.includes(dominantGenre.toLowerCase()) ||
        dominantGenre.toLowerCase().includes(normalized);
    }).length;
    if (genreOverlap > 0) {
      score += 20;
      reasons.push(`Related to your ${dominantGenre} interest`);
    }
  }

  // Mood match via themes (0-30 points)
  if (dominantMood && MOOD_THEME_MAP[dominantMood]) {
    const moodThemes = MOOD_THEME_MAP[dominantMood];
    const themeMatches = game.themes.filter(t =>
      moodThemes.some(mt => t.toLowerCase().includes(mt) || mt.includes(t.toLowerCase()))
    ).length;
    if (themeMatches > 0) {
      score += Math.min(30, themeMatches * 10);
      reasons.push(`Matches your ${dominantMood.toLowerCase()} vibe`);
    }
  }

  // Session length match (0-20 points)
  if (preferredSessionBucket && SESSION_TIME_MAP[preferredSessionBucket]) {
    const timeRange = SESSION_TIME_MAP[preferredSessionBucket];
    if (game.avgTime >= timeRange.min && game.avgTime <= timeRange.max) {
      score += 20;
      reasons.push(`${sessionPatternLabel || preferredSessionBucket} — ~${game.avgTime}h matches your rhythm`);
    } else if (Math.abs(game.avgTime - (timeRange.min + timeRange.max) / 2) < 20) {
      score += 10;
      reasons.push(`Close to your preferred session length`);
    }
  }

  // Rating bonus (0-10 points)
  if (game.rating >= 90) {
    score += 10;
    reasons.push('Critically acclaimed');
  } else if (game.rating >= 85) {
    score += 5;
  }

  return { score: Math.min(100, score), reasons };
};

// Format price from cents to display string
const formatPrice = (cents, discount = 0) => {
  if (cents === 0) return { display: 'Free', original: null, discount };
  const fmt = (n) => {
    const s = (n / 100).toFixed(2);
    return s.endsWith('.00') ? s.slice(0, -3) : s;
  };
  if (discount > 0) {
    const original = fmt(cents);
    const discounted = fmt((cents * (100 - discount)) / 100);
    return { display: `$${discounted}`, original: `$${original}`, discount };
  }
  return { display: `$${fmt(cents)}`, original: null, discount: 0 };
};

export class DiscoveryService {
  static async getRecommendations({ limit = 6, forceRefresh = false } = {}) {
    const cached = StorageService.get(DISCOVERY_CACHE_KEY, null);
    const now = Date.now();

    if (!forceRefresh && cached && now - cached.timestamp < DISCOVERY_CACHE_TTL) {
      return cached.recommendations;
    }

    const persona = UserBehaviorProfile.getPersonaSnapshot() || {};
    const library = StorageService.get('library', []);

    // Score all demo games against persona
    const scored = DEMO_GAME_DATABASE.map(game => {
      const { score, reasons } = scoreGameForPersona(game, persona);
      return {
        ...game,
        matchScore: score,
        matchReasons: reasons,
        priceFormatted: formatPrice(game.price.steam, game.price.discount),
        inLibrary: isGameInLibrary(game.name, library)
      };
    });

    // Sort by score, filter out library games, take top N
    const recommendations = scored
      .filter(g => !g.inLibrary)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    StorageService.set(DISCOVERY_CACHE_KEY, { timestamp: now, recommendations });
    return recommendations;
  }

  static getWishlist() {
    return StorageService.get(WISHLIST_KEY, []);
  }

  static addToWishlist(game) {
    const wishlist = this.getWishlist();
    const exists = wishlist.some(w => w.id === game.id);
    if (exists) return wishlist;

    const updated = [...wishlist, {
      id: game.id,
      name: game.name,
      platforms: game.platforms,
      price: game.price,
      addedAt: Date.now()
    }];
    StorageService.set(WISHLIST_KEY, updated);
    return updated;
  }

  static removeFromWishlist(gameId) {
    const wishlist = this.getWishlist();
    const updated = wishlist.filter(w => w.id !== gameId);
    StorageService.set(WISHLIST_KEY, updated);
    return updated;
  }

  static isInWishlist(gameId) {
    return this.getWishlist().some(w => w.id === gameId);
  }

  static trackPrice(game) {
    const tracked = StorageService.get(PRICE_TRACKING_KEY, []);
    const exists = tracked.some(t => t.id === game.id);
    if (exists) return tracked;

    const updated = [...tracked, {
      id: game.id,
      name: game.name,
      currentPrice: game.price.steam,
      targetPrice: Math.round(game.price.steam * 0.6), // 40% off target
      platform: 'steam',
      addedAt: Date.now()
    }];
    StorageService.set(PRICE_TRACKING_KEY, updated);
    return updated;
  }

  static untrackPrice(gameId) {
    const tracked = StorageService.get(PRICE_TRACKING_KEY, []);
    const updated = tracked.filter(t => t.id !== gameId);
    StorageService.set(PRICE_TRACKING_KEY, updated);
    return updated;
  }

  static getPriceTracking() {
    return StorageService.get(PRICE_TRACKING_KEY, []);
  }

  static isPriceTracked(gameId) {
    return this.getPriceTracking().some(t => t.id === gameId);
  }

  // IGDB API methods — ready for real integration
  static async fetchFromIGDB(endpoint, query) {
    const clientId = StorageService.getString(IGDB_CLIENT_ID_KEY, '');
    const accessToken = StorageService.getString(IGDB_ACCESS_TOKEN_KEY, '');

    if (!clientId || !accessToken) {
      throw new Error('IGDB credentials not configured. Set Client ID and Access Token in settings.');
    }

    const response = await fetch(`${IGDB_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain'
      },
      body: query
    });

    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status}`);
    }

    return response.json();
  }

  static async searchGamesByPersona(personaSnapshot, limit = 10) {
    const { dominantMood, dominantGenre, preferredSessionBucket } = personaSnapshot;

    // Build IGDB query from persona
    const genreId = GENRE_ID_MAP[dominantGenre];
    const themes = dominantMood ? MOOD_THEME_MAP[dominantMood] : [];

    let query = `fields name, genres.name, themes.name, rating, cover.url, summary, platforms.name, first_release_date;`;
    query += ` where rating >= 75`;

    if (genreId) {
      query += ` & genres = (${genreId})`;
    }

    if (themes.length > 0) {
      const themeFilter = themes.map(t => `themes.name ~ "${t}"`).join(' | ');
      query += ` & (${themeFilter})`;
    }

    if (preferredSessionBucket && SESSION_TIME_MAP[preferredSessionBucket]) {
      const timeRange = SESSION_TIME_MAP[preferredSessionBucket];
      query += ` & time_to_beat.normally >= ${timeRange.min} & time_to_beat.normally <= ${timeRange.max}`;
    }

    query += `; limit ${limit};`;

    return this.fetchFromIGDB('games', query);
  }

  // Settings helpers
  static setIGDBCredentials(clientId, accessToken) {
    StorageService.setString(IGDB_CLIENT_ID_KEY, clientId);
    StorageService.setString(IGDB_ACCESS_TOKEN_KEY, accessToken);
  }

  static getIGDBCredentials() {
    return {
      clientId: StorageService.getString(IGDB_CLIENT_ID_KEY, ''),
      accessToken: StorageService.getString(IGDB_ACCESS_TOKEN_KEY, '')
    };
  }

  static hasIGDBCredentials() {
    const creds = this.getIGDBCredentials();
    return Boolean(creds.clientId && creds.accessToken);
  }

  static clearCache() {
    StorageService.remove(DISCOVERY_CACHE_KEY);
  }
}

export default DiscoveryService;
