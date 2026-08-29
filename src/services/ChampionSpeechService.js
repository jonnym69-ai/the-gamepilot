/**
 * ChampionSpeechService — generates in-character acceptance speeches when a
 * game wins a weekly/monthly/yearly champion title. The speech tone is
 * determined by the game's genre and the user's persona.
 *
 * Called from PeriodChampionService when locking a champion.
 */

import StorageService from './StorageService';

const SPEECH_KEY = 'gamepilot-champion-speeches';

// ---------------------------------------------------------------------------
// Genre → speech tone mapping
// ---------------------------------------------------------------------------

const TONE_MAP = {
  souls: {
    keywords: ['souls', 'soulslike', 'dark fantasy', 'elden', 'sekiro', 'bloodborne'],
    speeches: [
      'I am the champion. I earned this through suffering. The others were unworthy.',
      'Through death and perseverance, I have claimed the throne. Let the others rot in the backlog.',
      'Victory is not given. It is taken. And I have taken it. Praise the sun.',
      'The throne was not inherited. It was conquered. Many died. I endured.'
    ]
  },
  cozy: {
    keywords: ['cozy', 'farming', 'life sim', 'casual', 'relaxing', 'stardew'],
    speeches: [
      'Oh gosh, thank you! I would like to thank my crops, my chickens, and all the lovely people in town.',
      'This is so nice! I did not expect to win. I just wanted everyone to be happy and well-fed.',
      'Thank you! I would like to dedicate this to my farm. The tomatoes are doing wonderfully this season.',
      'Aww, shucks. Champion! Me! I should bake a pie to celebrate. Everyone is invited.'
    ]
  },
  strategy: {
    keywords: ['strategy', '4x', 'grand strategy', 'turn-based', 'tactical', 'civ', 'civilization'],
    speeches: [
      'This victory was inevitable. The outcome was never in doubt. We now return to our 500-year plan.',
      'The campaign was meticulously calculated. Every hour was an investment. The ROI speaks for itself.',
      'Victory through superior planning. The opponent never had a chance. They simply did not know it yet.',
      'One more turn. One more turn. One more turn. And now I am champion. The empire expands.'
    ]
  },
  fps: {
    keywords: ['shooter', 'fps', 'tactical shooter', 'hero shooter', 'battle royale'],
    speeches: [
      'GG. Easy. Next.',
      'Champion. Was there ever any doubt? The crosshairs do not lie.',
      'Clutch or kick. I clutched. Every. Single. Time.',
      'Aim was on point. Movement was crisp. The throne is mine. EZ Clap.'
    ]
  },
  rpg: {
    keywords: ['rpg', 'role-playing', 'jrpg', 'wrpg', 'action rpg', 'open world rpg'],
    speeches: [
      'The prophecy foretold of a champion. I am that champion. The side quests prepared me well.',
      'Every NPC said I was the chosen one. They were right. The main quest can wait. This throne cannot.',
      'I grinded 200 levels for this. Every random encounter was a stepping stone. The throne is earned.',
      'My party carried me. But I carried them first. The champion title stays with the protagonist.'
    ]
  },
  horror: {
    keywords: ['horror', 'survival horror', 'psychological horror'],
    speeches: [
      'I won. I survived. The others did not. That is the way of horror. And I am still here.',
      'The dark could not claim me. The throne is mine. The nightmares only made me stronger.',
      'Champion. They said it was impossible. They died. I did not. That is the qualification.'
    ]
  },
  indie: {
    keywords: ['indie', 'pixel', 'experimental', 'retro'],
    speeches: [
      'I cannot believe a game made by 2 people beat the AAA titles. Wait, yes I can. Art wins.',
      'No budget. No team of 500. Just passion and pixels. And now, a championship.',
      'They said I was too small to compete. I am the champion. Size was never the point.',
      'Made in a bedroom. Played in a bedroom. Champion of the bedroom. The circle is complete.'
    ]
  },
  racing: {
    keywords: ['racing', 'sim racing', 'arcade racing'],
    speeches: [
      'Pole position. Every lap. Every session. The finish line was a formality.',
      'Speed is not a strategy. It is a personality. And I am the fastest. Champion confirmed.',
      'The track was mine. The throne is mine. The podium has room for one. Me.'
    ]
  },
  fighting: {
    keywords: ['fighting', 'fighting game', 'brawler', 'beat em up'],
    speeches: [
      'Round 1. Fight. Perfect. Champion. The combo was flawless.',
      'I did not drop a single combo. The throne was never in question. GG.',
      'Frame data does not lie. I was plus on block. I am plus on the throne.'
    ]
  },
  roguelike: {
    keywords: ['roguelike', 'roguelite', 'permadeath'],
    speeches: [
      'I died 47 times for this. Each death was a lesson. The throne is the final boss. I beat it.',
      'One more run. That is what I said. Now I am champion. The loop is complete.',
      'Permadeath could not stop me. It only made me angrier. And now I am champion. Angry champion.'
    ]
  }
};

const DEFAULT_SPEECHES = [
  'I am the champion. The hours do not lie. The throne is earned.',
  'Champion. The word fits. The hours justify it. The competition was... present.',
  'Thank you. I would like to thank the user for choosing me every single time. I will not let them down.',
  'The throne is mine. The sessions were many. The victory was inevitable.',
  'I did not ask to be champion. But I did not refuse it either. Here we are.'
];

// ---------------------------------------------------------------------------
// Tone detection
// ---------------------------------------------------------------------------

const detectTone = (game, library) => {
  if (!game?.name) return null;

  const libGame = library?.find((g) =>
    (g.name || g.title || '') === game.name
  );

  const genres = (libGame?.genres || game.genres || []).map((g) => String(g).toLowerCase());
  const tags = (libGame?.tags || []).map((t) => String(t).toLowerCase());
  const name = String(game.name).toLowerCase();
  const allText = [...genres, ...tags, name];

  for (const [toneId, tone] of Object.entries(TONE_MAP)) {
    if (tone.keywords.some((kw) => allText.some((text) => text.includes(kw)))) {
      return { id: toneId, speeches: tone.speeches };
    }
  }

  return null;
};

// ---------------------------------------------------------------------------
// Speech generation
// ---------------------------------------------------------------------------

const pickSpeech = (speeches, seed) => {
  if (!Array.isArray(speeches) || speeches.length === 0) return null;
  const idx = Math.abs(seed) % speeches.length;
  return speeches[idx];
};

/**
 * Generate an acceptance speech for a champion.
 * @param {Object} champion - The champion object from PeriodChampionService
 * @param {Array} library - The game library for genre lookup
 * @returns {Object} { speech, tone } or { speech, tone: 'default' }
 */
export const generateSpeech = (champion, library = []) => {
  if (!champion?.game?.name) return null;

  const seed = (champion.minutes || 0) + String(champion.game.name).length + (champion.sessionCount || 0);
  const tone = detectTone(champion.game, library);
  const speeches = tone?.speeches || DEFAULT_SPEECHES;
  const speech = pickSpeech(speeches, seed);

  if (!speech) return null;

  return {
    speech,
    tone: tone?.id || 'default'
  };
};

// ---------------------------------------------------------------------------
// Storage — speeches stored separately, keyed by period:periodKey
// ---------------------------------------------------------------------------

const getStoredSpeeches = () => {
  try {
    const raw = StorageService.getString(SPEECH_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveStoredSpeeches = (speeches) => {
  StorageService.setString(SPEECH_KEY, JSON.stringify(speeches));
};

/**
 * Store a speech for a champion.
 * @param {string} period - 'week', 'month', or 'year'
 * @param {string} periodKey - The period key (e.g. '2026-08-24')
 * @param {Object} speechData - { speech, tone }
 */
export const storeSpeech = (period, periodKey, speechData) => {
  if (!period || !periodKey || !speechData?.speech) return;
  const speeches = getStoredSpeeches();
  speeches[`${period}:${periodKey}`] = speechData;
  saveStoredSpeeches(speeches);
};

/**
 * Retrieve a speech for a champion.
 * @param {string} period
 * @param {string} periodKey
 * @returns {Object|null} { speech, tone }
 */
export const getSpeech = (period, periodKey) => {
  const speeches = getStoredSpeeches();
  return speeches[`${period}:${periodKey}`] || null;
};

/**
 * Generate and store a speech for a newly locked champion.
 * Called from PeriodChampionService.lockPeriod.
 * @param {Object} champion - The locked champion object
 * @param {Array} library - Game library for genre lookup
 * @returns {Object|null} { speech, tone }
 */
export const generateAndStoreSpeech = (champion, library = []) => {
  const result = generateSpeech(champion, library);
  if (result && champion?.period && champion?.periodKey) {
    storeSpeech(champion.period, champion.periodKey, result);
  }
  return result;
};

const ChampionSpeechService = {
  generateSpeech,
  generateAndStoreSpeech,
  storeSpeech,
  getSpeech
};

export default ChampionSpeechService;
