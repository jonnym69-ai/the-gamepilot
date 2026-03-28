// GenresMoods.js - Fixed 16 genres and 8 moods system (independent of game data)

export const GENRES = [
  'Action',
  'Adventure',
  'Casual',
  'Competitive',
  'Fighting',
  'Horror',
  'Indie',
  'Management',
  'Multiplayer',
  'Party',
  'Platformer',
  'Puzzle',
  'Racing',
  'Roguelike',
  'RPG',
  'Sandbox',
  'Shooter',
  'Simulation',
  'Sports',
  'Stealth',
  'Story-driven',
  'Strategy',
  'Survival',
  'Tactical'
];

export const MOODS = [
  'Relaxed',
  'Social',
  'Creative',
  'Focused',
  'Escapist',
  'Tactical',
  'Sporty',
  'Competitive'
];

// Genre->Mood mapping (expanded so nothing falls through to "Unknown")
export const GENRE_MOOD_MAP = {
  Relaxed: ['Casual', 'Story-driven', 'Simulation', 'Indie'],
  Social: ['Multiplayer', 'Party', 'Casual'],
  Creative: ['Sandbox', 'Puzzle', 'Simulation', 'Indie', 'Platformer'],
  Focused: ['Strategy', 'Tactical', 'Roguelike', 'Management'],
  Escapist: ['RPG', 'Adventure', 'Story-driven'],
  Tactical: ['Action', 'Shooter', 'Stealth', 'Survival'],
  Sporty: ['Sports', 'Racing'],
  Competitive: ['Fighting', 'Competitive', 'Shooter', 'Multiplayer']
};

const CANONICAL_LOOKUP = GENRES.reduce((acc, genre) => {
  acc[genre.toLowerCase()] = genre;
  return acc;
}, {});

const GENRE_ALIAS_MAP = {
  'action adventure': ['Action', 'Adventure'],
  'action-adventure': ['Action', 'Adventure'],
  'action rpg': ['Action', 'RPG'],
  'arpg': ['Action', 'RPG'],
  'jrpg': ['RPG'],
  'wrpg': ['RPG'],
  'mmorpg': ['RPG', 'Multiplayer'],
  'looter shooter': ['Shooter', 'RPG'],
  'soulslike': ['Action', 'RPG', 'Tactical'],
  'souls-like': ['Action', 'RPG', 'Tactical'],
  'metroidvania': ['Action', 'Adventure'],
  'platformer': ['Platformer', 'Action'],
  'platform': ['Platformer', 'Action'],
  'stealth': ['Stealth', 'Action'],
  'stealth action': ['Stealth', 'Action'],
  'roguelite': ['Roguelike'],
  'rogue-lite': ['Roguelike'],
  'rogue like': ['Roguelike'],
  'deckbuilder': ['Strategy', 'Tactical'],
  'deck builder': ['Strategy', 'Tactical'],
  'card battler': ['Strategy', 'Tactical'],
  'puzzle platformer': ['Puzzle', 'Platformer'],
  'co-op': ['Multiplayer', 'Party'],
  'cooperative': ['Multiplayer', 'Party'],
  'battle royale': ['Shooter', 'Competitive'],
  'fps': ['Shooter'],
  'tps': ['Shooter', 'Action'],
  'first person shooter': ['Shooter'],
  'third person shooter': ['Shooter', 'Action'],
  'open world': ['Adventure', 'Action'],
  'survival horror': ['Horror', 'Survival'],
  'builder': ['Simulation', 'Management'],
  'city builder': ['Simulation', 'Management'],
  'life sim': ['Simulation', 'Casual'],
  'management sim': ['Management', 'Simulation'],
  'tycoon': ['Management', 'Simulation'],
  'sandbox survival': ['Sandbox', 'Survival'],
  'crafting': ['Sandbox', 'Survival'],
  'rhythm': ['Casual', 'Creative'],
  'music': ['Casual', 'Creative'],
  'story rich': ['Story-driven'],
  'narrative': ['Story-driven']
};

const sanitize = (label = '') =>
  label
    .toString()
    .toLowerCase()
    .replace(/[®™]/g, '')
    .replace(/&/g, 'and')
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const expandAliasToGenres = (label) => {
  const normalized = sanitize(label);
  if (CANONICAL_LOOKUP[normalized]) {
    return [CANONICAL_LOOKUP[normalized]];
  }
  return GENRE_ALIAS_MAP[normalized] || [];
};

const KEYWORD_HINTS = [
  { test: /(roguelike|rogue\s?lite)/, genres: ['Roguelike'] },
  { test: /horror/, genres: ['Horror'] },
  { test: /survival/, genres: ['Survival'] },
  { test: /(builder|tycoon|management)/, genres: ['Simulation', 'Management'] },
  { test: /(co\s?-?op|cooperative|multiplayer)/, genres: ['Multiplayer', 'Party'] },
  { test: /puzzle/, genres: ['Puzzle'] },
  { test: /platform/, genres: ['Platformer', 'Action'] },
  { test: /(strategy|tactic|tactical)/, genres: ['Strategy', 'Tactical'] },
  { test: /(shooter|fps|tps|gun)/, genres: ['Shooter', 'Action'] },
  { test: /(racing|driving|kart)/, genres: ['Racing', 'Sports'] },
  { test: /(sport|soccer|basketball|football|golf|skate)/, genres: ['Sports'] },
  { test: /(sandbox|craft|builder)/, genres: ['Sandbox', 'Survival'] },
  { test: /(simulation|simulator)/, genres: ['Simulation'] },
  { test: /(story|narrative|visual novel)/, genres: ['Story-driven'] }
];

const inferGenresFromKeywords = (label) => {
  const normalized = sanitize(label);
  if (!normalized) return [];
  for (const hint of KEYWORD_HINTS) {
    if (hint.test.test(normalized)) {
      return hint.genres;
    }
  }
  return [];
};

export const normalizeGenres = (gameGenres) => {
  if (!Array.isArray(gameGenres)) {
    return [];
  }

  const normalizedSet = new Set();

  gameGenres.forEach((rawLabel) => {
    if (!rawLabel) return;
    const normalizedLabel = sanitize(String(rawLabel));
    if (!normalizedLabel) return;

    const canonical = expandAliasToGenres(normalizedLabel);
    if (canonical.length) {
      canonical.forEach((genre) => normalizedSet.add(genre));
      return;
    }

    const keywordGenres = inferGenresFromKeywords(normalizedLabel);
    if (keywordGenres.length) {
      keywordGenres.forEach((genre) => normalizedSet.add(genre));
      return;
    }

    // If still unmatched, keep exact label when it's already canonical casing
    if (CANONICAL_LOOKUP[normalizedLabel]) {
      normalizedSet.add(CANONICAL_LOOKUP[normalizedLabel]);
    }
  });

  return Array.from(normalizedSet);
};

const DEFAULT_FALLBACK_GENRE = 'Story-driven';

const scoreMoodsFromGenres = (genres) => {
  const moodScores = {};
  genres.forEach((genre) => {
    const mood = GENRE_TO_MOOD[genre];
    if (!mood) return;
    moodScores[mood] = (moodScores[mood] || 0) + 1;
  });
  return moodScores;
};

// Reverse mapping: Genre -> Mood
export const GENRE_TO_MOOD = {};

// Initialize reverse mapping
Object.entries(GENRE_MOOD_MAP).forEach(([mood, genres]) => {
  genres.forEach(genre => {
    GENRE_TO_MOOD[genre] = mood;
  });
});

// Get mood for a genre
export const getMoodForGenre = (genre) => {
  return GENRE_TO_MOOD[genre] || null;
};

// Get genres for a mood
export const getGenresForMood = (mood) => {
  return GENRE_MOOD_MAP[mood] || [];
};

// Check if genre is valid
export const isValidGenre = (genre) => {
  return GENRES.includes(genre);
};

// Check if mood is valid
export const isValidMood = (mood) => {
  return MOODS.includes(mood);
};

// Get all genres
export const getAllGenres = () => GENRES;

// Get all moods
export const getAllMoods = () => MOODS;

// Map game genres to valid genres
export const mapGameGenresToValid = (gameGenres) => {
  const normalized = normalizeGenres(gameGenres);
  if (normalized.length) {
    return normalized;
  }

  // Provide a graceful fallback so recommendations never see "Unknown" genres
  if (Array.isArray(gameGenres) && gameGenres.length > 0) {
    return [DEFAULT_FALLBACK_GENRE];
  }

  return [];
};

// Get mood for game based on its genres
export const getMoodForGame = (gameGenres) => {
  const validGenres = mapGameGenresToValid(gameGenres);

  if (validGenres.length === 0) {
    return null;
  }

  const moodScores = scoreMoodsFromGenres(validGenres);
  const sortedMoods = Object.entries(moodScores).sort((a, b) => b[1] - a[1]);
  return sortedMoods.length ? sortedMoods[0][0] : null;
};

export const getMoodScoresForGame = (gameGenres) => {
  const validGenres = mapGameGenresToValid(gameGenres);
  if (validGenres.length === 0) {
    return {};
  }

  return scoreMoodsFromGenres(validGenres);
};

// Get all moods that have games in library
export const getAvailableMoods = (library) => {
  const moodsWithGames = new Set();

  library.forEach(game => {
    const mood = getMoodForGame(game.genres);
    if (mood) {
      moodsWithGames.add(mood);
    }
  });

  return Array.from(moodsWithGames);
};

// Get all genres that have games in library
export const getAvailableGenres = (library) => {
  const genresWithGames = new Set();

  library.forEach(game => {
    const validGenres = mapGameGenresToValid(game.genres);
    validGenres.forEach(genre => genresWithGames.add(genre));
  });

  return Array.from(genresWithGames);
};

// Count games in a genre
export const countGamesInGenre = (library, genre) => {
  if (!isValidGenre(genre)) {
    return 0;
  }

  return library.filter(game => {
    const validGenres = mapGameGenresToValid(game.genres);
    return validGenres.includes(genre);
  }).length;
};

// Count games in a mood
export const countGamesInMood = (library, mood) => {
  if (!isValidMood(mood)) {
    return 0;
  }

  const genresForMood = getGenresForMood(mood);
  
  return library.filter(game => {
    const validGenres = mapGameGenresToValid(game.genres);
    return validGenres.some(genre => genresForMood.includes(genre));
  }).length;
};

// Get genre distribution for all genres
export const getGenreDistribution = (library) => {
  const distribution = {};

  GENRES.forEach(genre => {
    distribution[genre] = countGamesInGenre(library, genre);
  });

  return distribution;
};

// Get mood distribution for all moods
export const getMoodDistribution = (library) => {
  const distribution = {};

  MOODS.forEach(mood => {
    distribution[mood] = countGamesInMood(library, mood);
  });

  return distribution;
};
