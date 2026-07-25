// GenresMoods.js - Fixed genres and 5 moods system (independent of game data)

export const GENRES = [
  'Action',
  'Adventure',
  'Casual',
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
  'Competitive'
];

// Genre->Mood mapping
export const GENRE_MOOD_MAP = {
  Relaxed: ['Casual', 'Simulation', 'Platformer', 'Puzzle', 'Management'],
  Social: ['Multiplayer', 'Party'],
  Creative: ['Sandbox', 'Survival', 'Indie', 'Adventure', 'Story-driven'],
  Focused: ['RPG', 'Strategy', 'Tactical', 'Roguelike', 'Stealth', 'Horror', 'Action', 'Shooter'],
  Competitive: ['Fighting', 'Sports', 'Racing', 'Shooter', 'Multiplayer']
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
  'metroidvania': ['Platformer', 'Adventure'],
  'platformer': ['Platformer'],
  'platform': ['Platformer'],
  'stealth': ['Stealth'],
  'stealth action': ['Stealth'],
  'roguelite': ['Roguelike'],
  'rogue-lite': ['Roguelike'],
  'rogue like': ['Roguelike'],
  'deckbuilder': ['Strategy', 'Tactical'],
  'deck builder': ['Strategy', 'Tactical'],
  'card battler': ['Strategy', 'Tactical'],
  'puzzle platformer': ['Puzzle', 'Platformer'],
  'co-op': ['Multiplayer', 'Party'],
  'cooperative': ['Multiplayer', 'Party'],
  'battle royale': ['Shooter', 'Multiplayer'],
  'fps': ['Shooter'],
  'tps': ['Shooter'],
  'first person shooter': ['Shooter'],
  'third person shooter': ['Shooter'],
  'open world': ['Adventure'],
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
  { test: /platform/, genres: ['Platformer'] },
  { test: /(strategy|tactic|tactical)/, genres: ['Strategy', 'Tactical'] },
  { test: /(shooter|fps|tps|gun)/, genres: ['Shooter'] },
  { test: /(racing|driving|kart)/, genres: ['Racing'] },
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

// Genre weight: how strongly a genre signals its mapped mood.
const GENRE_SIGNAL_WEIGHT = {
  Indie: 0.3,       // Weak Creative signal — wins only when no stronger genre present
  Action: 0.5,      // Moderate Focused — common genre, doesn't dominate
  Adventure: 0.5,   // Moderate Creative — common genre, doesn't dominate
  Multiplayer: 0.5, // Moderate — appears in Social and Competitive, context decides
  Shooter: 0.5      // Moderate — appears in Focused and Competitive, context decides
};

// Context suppression: when certain genres appear together, one genre's mood
// contribution is suppressed. E.g., "Simulation" stops counting toward Relaxed
// when Management/Strategy/Survival are also present (colony mgmt ≠ relaxing).
const GENRE_CONTEXT_SUPPRESSION = [
  // Colony/management sims with Strategy or Survival aren't relaxing
  { ifPresent: ['Strategy', 'Survival'], suppress: 'Simulation', fromMood: 'Relaxed' },
  // Competitive shooters (Shooter + Multiplayer) → Competitive, not Focused
  { ifPresent: ['Multiplayer'], suppress: 'Shooter', fromMood: 'Focused' },
  // Party/coop games (Multiplayer + Party) → Social, not Competitive
  { ifPresent: ['Party'], suppress: 'Multiplayer', fromMood: 'Competitive' }
];

const scoreMoodsFromGenres = (genres) => {
  const moodScores = {};
  const genreSet = new Set(genres);

  genres.forEach((genre) => {
    const weight = GENRE_SIGNAL_WEIGHT[genre] || 1.0;
    Object.entries(GENRE_MOOD_MAP).forEach(([mood, mappedGenres]) => {
      if (!Array.isArray(mappedGenres) || !mappedGenres.includes(genre)) {
        return;
      }

      // Check if this genre's contribution to this mood is suppressed by context
      const suppressed = GENRE_CONTEXT_SUPPRESSION.some(
        (rule) => rule.suppress === genre && rule.fromMood === mood
          && rule.ifPresent.some((trigger) => genreSet.has(trigger))
      );
      if (suppressed) {
        return;
      }

      moodScores[mood] = (moodScores[mood] || 0) + weight;
    });
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

  return [];
};

// Get mood for game based on its genres
export const getMoodForGame = (gameGenres) => {
  const validGenres = mapGameGenresToValid(gameGenres);

  if (validGenres.length === 0) {
    return null;
  }

  const moodScores = scoreMoodsFromGenres(validGenres);
  // Sort by score descending; on tie, prefer MOODS order (Relaxed > Social > Creative > Focused > Competitive)
  const sortedMoods = Object.entries(moodScores).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return MOODS.indexOf(a[0]) - MOODS.indexOf(b[0]);
  });
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
