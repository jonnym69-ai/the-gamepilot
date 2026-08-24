import { GamingPersonaService, PERSONA_AFFINITY_GENRES } from './GamingPersonaService';
import StorageService from './StorageService';
import SessionRepository from './SessionRepository';

// Mirrors the archetype ids defined in GamingPersonaService's ARCHETYPES list.
// If an archetype is added/renamed there, update this list — the coverage test
// below is the regression guard against persona ids silently losing their
// genre affinity (the class of bug that broke buy-rec matching in the past).
const ARCHETYPE_IDS = [
  'backlog_archaeologist',
  'credit_roll_dodger',
  'frame_data_masochist',
  'spreadsheet_tactician',
  'story_diver',
  'comfort_replay_junkie',
  'indie_curator',
  'franchise_loyalist',
  'retro_futurist',
  'bleeding_edge',
  'completionist',
  'roamer',
  'social_drop_in',
  'jank_enjoyer',
  'modder',
  'speedrunner',
  'multiplayer_mainliner',
  'weekend_warrior',
  'lunch_break_gamer'
];

const makeGame = (overrides = {}) => ({
  appid: overrides.appid || String(Math.random()),
  name: 'Game',
  platform: 'steam',
  genres: ['RPG'],
  tags: [],
  time_played: 0,
  ...overrides
});

// A large, entirely unplayed library — textbook Backlog Archaeologist.
const seedBacklogLibrary = (count = 25) => {
  const games = Array.from({ length: count }, (_, i) => makeGame({
    appid: String(i + 1),
    name: `Unplayed Game ${i + 1}`,
    time_played: 0
  }));
  StorageService.set('library', games);
  return games;
};

// A small library of hard games played for real hours — textbook masochist.
const seedHardLibrary = () => {
  const games = [1, 2, 3].map((i) => makeGame({
    appid: String(i),
    name: `Pain Simulator ${i}`,
    genres: ['Action'],
    tags: ['souls-like'],
    time_played: 120
  }));
  StorageService.set('library', games);
  return games;
};

const makeSession = ({ hoursAgo = 0, atHour = null, minutes = 90, gameName = 'Late Game' } = {}) => {
  const start = new Date();
  if (atHour !== null) {
    start.setHours(atHour, 0, 0, 0);
  }
  start.setTime(start.getTime() - hoursAgo * 60 * 60 * 1000);
  return {
    sessionId: `${gameName}-${start.getTime()}-${Math.random()}`,
    gameName,
    startTime: start.toISOString(),
    playtimeMinutes: minutes
  };
};

describe('GamingPersonaService', () => {
  beforeEach(() => {
    localStorage.clear();
    GamingPersonaService.clearPinnedPersona();
    SessionRepository.replaceHistory([]);
  });

  describe('PERSONA_AFFINITY_GENRES integrity', () => {
    test('every archetype id has a non-empty affinity list', () => {
      ARCHETYPE_IDS.forEach((id) => {
        const genres = PERSONA_AFFINITY_GENRES[id];
        expect(Array.isArray(genres)).toBe(true);
        expect(genres.length).toBeGreaterThan(0);
      });
    });

    test('every map entry is a non-empty array of strings', () => {
      Object.entries(PERSONA_AFFINITY_GENRES).forEach(([id, genres]) => {
        expect(genres.length).toBeGreaterThan(0);
        genres.forEach((g) => expect(typeof g).toBe('string'));
      });
    });
  });

  describe('getAffinityGenres', () => {
    test('returns the affinity list for a known persona id', () => {
      expect(GamingPersonaService.getAffinityGenres('story_diver')).toEqual(
        PERSONA_AFFINITY_GENRES.story_diver
      );
    });

    test('returns empty array for an unknown persona id', () => {
      expect(GamingPersonaService.getAffinityGenres('not_a_real_persona')).toEqual([]);
    });

    test('does not throw when no id is given and no persona can be computed', () => {
      const result = GamingPersonaService.getAffinityGenres(null);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('gameMatchesPersona', () => {
    test('matches on exact genre, case-insensitively', () => {
      expect(GamingPersonaService.gameMatchesPersona({ genres: ['rpg'] }, 'backlog_archaeologist')).toBe(true);
    });

    test('matches on tags as well as genres', () => {
      expect(GamingPersonaService.gameMatchesPersona({ genres: [], tags: ['Puzzle'] }, 'backlog_archaeologist')).toBe(true);
    });

    test('matches on partial containment (e.g. "Action RPG" contains "RPG")', () => {
      expect(GamingPersonaService.gameMatchesPersona({ genres: ['Action RPG'] }, 'backlog_archaeologist')).toBe(true);
    });

    test('does not match unrelated genres', () => {
      expect(GamingPersonaService.gameMatchesPersona({ genres: ['FPS'] }, 'backlog_archaeologist')).toBe(false);
    });

    test('returns false for an unknown persona id', () => {
      expect(GamingPersonaService.gameMatchesPersona({ genres: ['RPG'] }, 'not_a_real_persona')).toBe(false);
    });
  });

  describe('getPersona scoring', () => {
    test('handles an empty library without crashing', () => {
      const persona = GamingPersonaService.getPersona();
      expect(persona).toBeTruthy();
      expect(typeof persona.summaryRoast).toBe('string');
      expect(persona.confidence).toBe('low');
    });

    test('identifies a large unplayed library as The Backlog Archaeologist', () => {
      seedBacklogLibrary(25);
      const persona = GamingPersonaService.getPersona();
      expect(persona.primaryPersona.id).toBe('backlog_archaeologist');
      expect(persona.primaryPersona.score).toBeGreaterThan(0);
      expect(persona.confidence).toBe('high');
    });

    test('identifies a hard-games library as The Frame-Data Masochist', () => {
      seedHardLibrary();
      const persona = GamingPersonaService.getPersona();
      expect(persona.primaryPersona.id).toBe('frame_data_masochist');
      expect(persona.signals.challengeRatio).toBe(100);
      expect(persona.signals.hardGameRatio).toBe(100);
      // All playtime is in one genre -> genre specialist sub-trait should fire
      expect(persona.subTraits.some((t) => t.id === 'genre_specialist')).toBe(true);
    });

    test('all archetype scores are clamped to 0-100 and sorted descending', () => {
      seedHardLibrary();
      const { allArchetypes } = GamingPersonaService.getPersona();
      allArchetypes.forEach((a) => {
        expect(a.score).toBeGreaterThanOrEqual(0);
        expect(a.score).toBeLessThanOrEqual(100);
      });
      for (let i = 1; i < allArchetypes.length; i += 1) {
        expect(allArchetypes[i - 1].score).toBeGreaterThanOrEqual(allArchetypes[i].score);
      }
    });

    test('primary persona matches the top of allArchetypes when nothing is pinned', () => {
      seedBacklogLibrary(25);
      const persona = GamingPersonaService.getPersona();
      expect(persona.primaryPersona.id).toBe(persona.allArchetypes[0].id);
    });

    test('a pinned persona overrides the auto-scored primary', () => {
      seedBacklogLibrary(25);
      GamingPersonaService.setPinnedPersonaId('speedrunner');
      const persona = GamingPersonaService.getPersona();
      expect(persona.primaryPersona.id).toBe('speedrunner');
    });

    test('the same custom seed produces the same roast', () => {
      seedBacklogLibrary(25);
      const first = GamingPersonaService.getPersona(null, 42).summaryRoast;
      const second = GamingPersonaService.getPersona(null, 42).summaryRoast;
      expect(first).toBe(second);
    });
  });

  describe('recency (windowDays) behavior', () => {
    test('defaults recencyHalfLifeDays to 30 when a window is set, null otherwise', () => {
      const windowed = GamingPersonaService.getPersona(null, null, { windowDays: 7 });
      expect(windowed.windowDays).toBe(7);
      expect(windowed.recencyHalfLifeDays).toBe(30);

      const allTime = GamingPersonaService.getPersona();
      expect(allTime.windowDays).toBeNull();
      expect(allTime.recencyHalfLifeDays).toBeNull();
    });

    test('detects night-owl play pattern from recent sessions within the window', () => {
      SessionRepository.replaceHistory([makeSession({ atHour: 2, minutes: 120 })]);
      const persona = GamingPersonaService.getPersona(null, null, { windowDays: 7 });
      expect(persona.subTraits.some((t) => t.id === 'night_owl')).toBe(true);
    });

    test('sessions older than the window are excluded from the recency read', () => {
      SessionRepository.replaceHistory([makeSession({ hoursAgo: 24 * 60, atHour: 2, minutes: 120 })]);
      const persona = GamingPersonaService.getPersona(null, null, { windowDays: 7 });
      expect(persona.subTraits.some((t) => t.id === 'night_owl')).toBe(false);
    });

    test('all-time mode without tracked behavior data does not infer a night-owl trait', () => {
      SessionRepository.replaceHistory([makeSession({ atHour: 2, minutes: 120 })]);
      const persona = GamingPersonaService.getPersona(null, null, { mode: 'all-time' });
      expect(persona.mode).toBe('all-time');
      expect(persona.subTraits.some((t) => t.id === 'night_owl')).toBe(false);
    });
  });

  describe('adaptive recent mode (default)', () => {
    // Library with a huge all-time game and a fresh obsession with no lifetime playtime.
    const seedRotationLibrary = () => {
      const games = [
        makeGame({ appid: 'old', name: 'Old Favorite', genres: ['FPS'], time_played: 10000 }),
        makeGame({ appid: 'new', name: 'New Crush', genres: ['Survival'], time_played: 0 })
      ];
      StorageService.set('library', games);
      return games;
    };

    test('default mode is recent with an all-time opt-in', () => {
      const recent = GamingPersonaService.getPersona();
      expect(recent.mode).toBe('recent');
      const allTime = GamingPersonaService.getPersona(null, null, { mode: 'all-time' });
      expect(allTime.mode).toBe('all-time');
    });

    test('a heavy recent binge leads the persona over a huge all-time game', () => {
      seedRotationLibrary();
      // 20h of New Crush across recent sessions (>= 10h takeover threshold)
      SessionRepository.replaceHistory([
        makeSession({ gameName: 'New Crush', minutes: 600, hoursAgo: 2 }),
        makeSession({ gameName: 'New Crush', minutes: 600, hoursAgo: 26 })
      ]);
      const persona = GamingPersonaService.getPersona();
      expect(persona.blendFactor).toBe(1);
      expect(persona.topGames[0].name).toBe('New Crush');
    });

    test('below the 10h takeover threshold, all-time play still fills the gaps', () => {
      seedRotationLibrary();
      // Only 1h tracked — blend factor 0.1, so lifetime playtime still dominates
      SessionRepository.replaceHistory([
        makeSession({ gameName: 'New Crush', minutes: 60 })
      ]);
      const persona = GamingPersonaService.getPersona();
      expect(persona.blendFactor).toBeLessThan(1);
      expect(persona.topGames[0].name).toBe('Old Favorite');
    });

    test('with no tracked sessions at all, persona is purely library-based', () => {
      seedRotationLibrary();
      const persona = GamingPersonaService.getPersona();
      expect(persona.blendFactor).toBe(0);
      expect(persona.topGames[0].name).toBe('Old Favorite');
    });

    test('a huge lifetime game cannot swamp a current binge through the blend', () => {
      // Regression: raw-minute blending let 12% of a 1587h lifetime (~190h)
      // outweigh a 20h recent binge. Share-based blending must not.
      StorageService.set('library', [
        makeGame({ appid: 'rust', name: 'Rust', genres: ['Survival'], time_played: 95220 }),
        makeGame({ appid: 'pz', name: 'Project Zomboid', genres: ['Survival'], time_played: 0 })
      ]);
      // 8.8h tracked (< 10h takeover threshold -> blendFactor 0.88), all Zomboid
      SessionRepository.replaceHistory([
        makeSession({ gameName: 'Project Zomboid', minutes: 264, hoursAgo: 2 }),
        makeSession({ gameName: 'Project Zomboid', minutes: 264, hoursAgo: 26 })
      ]);
      const persona = GamingPersonaService.getPersona();
      expect(persona.blendFactor).toBeLessThan(1);
      expect(persona.topGames[0].name).toBe('Project Zomboid');
    });

    test('roasts and evidence show real recent hours, not blend-scaled units', () => {
      StorageService.set('library', [
        makeGame({ appid: 'rust', name: 'Rust', genres: ['Survival'], time_played: 95220 }),
        makeGame({ appid: 'pz', name: 'Project Zomboid', genres: ['Survival'], time_played: 0 })
      ]);
      SessionRepository.replaceHistory([
        makeSession({ gameName: 'Project Zomboid', minutes: 600, hoursAgo: 2 }),
        makeSession({ gameName: 'Project Zomboid', minutes: 600, hoursAgo: 26 })
      ]);
      const persona = GamingPersonaService.getPersona();
      // 20h raw recent play — evidence should say 20h, not a scaled figure
      expect(persona.primaryPersona.evidence.some((e) => e.startsWith('20h in Project Zomboid'))).toBe(true);
    });

    test('launcher apps are excluded from persona signals', () => {
      StorageService.set('library', [
        makeGame({ appid: 'gog', name: 'GOG Galaxy', genres: [], time_played: 5000 }),
        makeGame({ appid: 'pz', name: 'Project Zomboid', genres: ['Survival'], time_played: 300 })
      ]);
      SessionRepository.replaceHistory([
        makeSession({ gameName: 'GOG Galaxy', minutes: 5 }),
        makeSession({ gameName: 'Project Zomboid', minutes: 600, hoursAgo: 2 }),
        makeSession({ gameName: 'Project Zomboid', minutes: 600, hoursAgo: 26 })
      ]);
      const persona = GamingPersonaService.getPersona();
      expect(persona.topGames.some((g) => g.name === 'GOG Galaxy')).toBe(false);
      expect(persona.topGames[0].name).toBe('Project Zomboid');
    });

    test('adaptive pool ignores calendar age — old sessions still count', () => {
      seedRotationLibrary();
      // 12h of New Crush, but from 60 days ago — a calendar window would drop
      // these, the adaptive pool keeps them because they are the most recent.
      SessionRepository.replaceHistory([
        makeSession({ gameName: 'New Crush', minutes: 720, hoursAgo: 24 * 60 })
      ]);
      const persona = GamingPersonaService.getPersona();
      expect(persona.topGames[0].name).toBe('New Crush');
    });

    test('infers night-owl trait from recent sessions in default mode', () => {
      SessionRepository.replaceHistory([makeSession({ atHour: 2, minutes: 120 })]);
      const persona = GamingPersonaService.getPersona();
      expect(persona.subTraits.some((t) => t.id === 'night_owl')).toBe(true);
    });
  });

  describe('theme layer (game-related personas)', () => {
    const seedZomboidWeek = () => {
      StorageService.set('library', [
        makeGame({ appid: 'pz', name: 'Project Zomboid', genres: ['Survival'], tags: ['Zombies', 'Post-apocalyptic', 'Open World Survival Craft'], time_played: 0 }),
        makeGame({ appid: 'rust', name: 'Rust', genres: ['Survival'], tags: ['Survival'], time_played: 95220 })
      ]);
      SessionRepository.replaceHistory([
        makeSession({ gameName: 'Project Zomboid', minutes: 600, hoursAgo: 2 }),
        makeSession({ gameName: 'Project Zomboid', minutes: 600, hoursAgo: 26 })
      ]);
    };

    test('recent zombie play produces a themed hybrid label', () => {
      seedZomboidWeek();
      const persona = GamingPersonaService.getPersona();
      expect(persona.primaryPersona.theme?.id).toBe('doomsday_prepper');
      expect(persona.primaryPersona.label).toContain('The Doomsday Prepper');
      expect(persona.primaryPersona.label).toContain(' who ');
      // The behavioral archetype is preserved as the label's second half
      expect(persona.primaryPersona.archetypeLabel).toBeTruthy();
      expect(persona.primaryPersona.evidence.some((e) => e.includes('the apocalypse'))).toBe(true);
    });

    test('theme roasts speak the theme language and name the real game', () => {
      seedZomboidWeek();
      const persona = GamingPersonaService.getPersona(null, 42);
      expect(typeof persona.primaryPersona.roast).toBe('string');
      expect(persona.primaryPersona.roast).toContain('Project Zomboid');
    });

    test('no dominant theme keeps the behavioral label unchanged', () => {
      seedBacklogLibrary(25); // plain RPG games, no theme tags
      const persona = GamingPersonaService.getPersona();
      expect(persona.primaryPersona.theme).toBeNull();
      expect(persona.primaryPersona.label).toBe('The Backlog Archaeologist');
    });

    test('theme follows the mode: recent rotation vs all-time library', () => {
      StorageService.set('library', [
        makeGame({ appid: 'racer', name: 'Speed Demons', genres: ['Racing'], tags: ['Racing', 'Driving'], time_played: 95220 }),
        makeGame({ appid: 'pz', name: 'Project Zomboid', genres: ['Survival'], tags: ['Zombies', 'Post-apocalyptic'], time_played: 0 })
      ]);
      SessionRepository.replaceHistory([
        makeSession({ gameName: 'Project Zomboid', minutes: 600, hoursAgo: 2 }),
        makeSession({ gameName: 'Project Zomboid', minutes: 600, hoursAgo: 26 })
      ]);
      const recent = GamingPersonaService.getPersona();
      expect(recent.primaryPersona.theme?.id).toBe('doomsday_prepper');
      const allTime = GamingPersonaService.getPersona(null, null, { mode: 'all-time' });
      expect(allTime.primaryPersona.theme?.id).toBe('gearhead');
    });
  });

  describe('getPublicIdentity', () => {
    test('returns a coherent identity for a backlog-heavy library', () => {
      seedBacklogLibrary(25);
      const identity = GamingPersonaService.getPublicIdentity();
      expect(identity.label).toBe('The Backlog Archaeologist');
      expect(identity.shortLabel).toBe('Backlog Archaeologist');
      expect(identity.becauseYouAre).toBe("Because you're The Backlog Archaeologist");
      expect(identity.affinityGenres).toEqual(PERSONA_AFFINITY_GENRES.backlog_archaeologist);
      expect(identity.confidence).toBe('high');
      expect(typeof identity.roast).toBe('string');
      expect(identity.headline).toContain(identity.label);
    });

    test('identity affinity genres always match the primary persona id', () => {
      seedHardLibrary();
      const identity = GamingPersonaService.getPublicIdentity();
      expect(identity.affinityGenres).toEqual(
        GamingPersonaService.getAffinityGenres(identity.primary.id)
      );
    });

    test('handles an empty library without crashing', () => {
      const identity = GamingPersonaService.getPublicIdentity();
      expect(identity).toBeTruthy();
      expect(typeof identity.headline).toBe('string');
      expect(typeof identity.becauseYouAre).toBe('string');
    });
  });

  describe('getGameSpecificRoast', () => {
    test('returns a contextual roast string for a valid game', () => {
      seedBacklogLibrary(25);
      const roast = GamingPersonaService.getGameSpecificRoast(
        { name: 'Unplayed Game 1', time_played: 600, genres: ['RPG'] },
        { seed: 42 }
      );
      expect(typeof roast).toBe('string');
      expect(roast.length).toBeGreaterThan(0);
    });

    test('returns null for a game without a name', () => {
      expect(GamingPersonaService.getGameSpecificRoast({ time_played: 600 })).toBeNull();
    });
  });
});
