// SignatureTitleService.js
// Game-earned profile titles. Unlike the XP-gated title catalog in
// ProgressionUnlockService, these unlock by putting real hours into a
// specific game — the "identity" layer that says what you obsessed over,
// not just that you played a lot.
//
// Two kinds:
//   1. Curated signature titles — hand-written names for iconic games and
//      series, matched by normalized title substring (e.g. "Zomboid
//      Survivor" for Project Zomboid, "Let Me Solo Her" for souls-likes).
//   2. Generated devotion titles — any game past the devotion thresholds
//      gets a title so every player's signature game is covered, even ones
//      we didn't curate.
//
// Playtime source: library entries' time_played, in minutes.

import StorageService from './StorageService';

const DEVOTEE_MINUTES = 50 * 60;
const LEGEND_MINUTES = 150 * 60;
const DEFAULT_REQUIRED_MINUTES = 25 * 60;

const normalizeName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const shortenName = (value) => {
  const name = String(value || '')
    .replace(/[™®©]/g, '')
    .split(/\s*[-:–—]\s*/)[0]
    .trim();
  return name.length > 26 ? `${name.slice(0, 25).trimEnd()}…` : name;
};

// ---------------------------------------------------------------------------
// Curated signature titles
// ---------------------------------------------------------------------------

const SIGNATURE_TITLES = [
  {
    id: 'sig_zomboid_survivor',
    sourceLabel: 'Project Zomboid',
    name: 'Zomboid Survivor',
    description: 'This is how you died — again and again, for weeks.',
    match: ['project zomboid'],
  },
  {
    id: 'sig_let_me_solo_her',
    sourceLabel: 'a souls-like (Elden Ring, Dark Souls, Sekiro...)',
    name: 'Let Me Solo Her',
    description: 'Hours spent dying to the same boss and calling it fun.',
    match: [
      'elden ring',
      'dark souls',
      'sekiro',
      'bloodborne',
      'lies of p',
      'lords of the fallen',
      'nioh',
      'mortal shell',
      'black myth wukong',
    ],
  },
  {
    id: 'sig_valley_farmer',
    sourceLabel: 'Stardew Valley',
    name: 'Valley Farmer',
    description: 'The farm is thriving. The backlog is not.',
    match: ['stardew valley'],
  },
  {
    id: 'sig_factory_must_grow',
    sourceLabel: 'Factorio or Satisfactory',
    name: 'The Factory Must Grow',
    description: 'One more production line. It was never just one.',
    match: ['factorio', 'satisfactory', 'shapez', 'dyson sphere'],
  },
  {
    id: 'sig_one_more_turn',
    sourceLabel: 'a Civilization-style 4X',
    name: 'One More Turn',
    description: 'You said that at midnight. It is now 4am.',
    match: ['civilization', 'humankind', 'endless legend'],
  },
  {
    id: 'sig_dragonborn',
    sourceLabel: 'Skyrim',
    name: 'Dragonborn',
    description: 'Fus ro dah, repeatedly, at every cliff edge.',
    match: ['skyrim', 'elder scrolls'],
  },
  {
    id: 'sig_true_soul',
    sourceLabel: "Baldur's Gate 3",
    name: 'True Soul',
    description: 'Approved by your conscience and your party alike.',
    match: ["baldur's gate", 'baldurs gate'],
  },
  {
    id: 'sig_death_defier',
    sourceLabel: 'Hades',
    name: 'Death Defier',
    description: 'There is no escape, but you keep trying anyway.',
    match: ['hades'],
  },
  {
    id: 'sig_rock_and_stone',
    sourceLabel: 'Deep Rock Galactic',
    name: 'Rock and Stone',
    description: 'For Karl. For the minerals. Rock and stone, brother.',
    match: ['deep rock galactic'],
  },
  {
    id: 'sig_phantom_thief',
    sourceLabel: 'Persona 5',
    name: 'Phantom Thief',
    description: 'Stealing hearts and hundreds of hours.',
    match: ['persona 5', 'persona 3', 'persona 4', 'metaphor refantazio'],
  },
  {
    id: 'sig_rip_and_tear',
    sourceLabel: 'a DOOM game',
    name: 'Rip and Tear',
    description: 'Until it is done. It is never done.',
    match: ['doom eternal', 'doom 2016', 'doom the dark ages', 'doom'],
  },
  {
    id: 'sig_interloper',
    sourceLabel: "No Man's Sky",
    name: 'Interloper',
    description: 'An entire universe, and you keep coming back to it.',
    match: ["no man's sky", 'no mans sky'],
  },
  {
    id: 'sig_strike_the_earth',
    sourceLabel: 'Dwarf Fortress',
    name: 'Strike the Earth',
    description: 'Losing is fun. You have the hours to prove it.',
    match: ['dwarf fortress'],
  },
  {
    id: 'sig_terrarian',
    sourceLabel: 'Terraria',
    name: 'Terrarian',
    description: 'Digging, building, bossing — on repeat.',
    match: ['terraria'],
  },
  {
    id: 'sig_master_builder',
    sourceLabel: 'Minecraft or Valheim',
    name: 'Master Builder',
    description: 'That dirt hut became a cathedral eventually.',
    match: ['minecraft', 'valheim', 'vintage story'],
  },
  {
    id: 'sig_colony_storyteller',
    sourceLabel: 'RimWorld',
    name: 'Colony Storyteller',
    description: 'Every disaster was, technically, a story.',
    match: ['rimworld'],
  },
  {
    id: 'sig_white_wolf',
    sourceLabel: 'The Witcher 3',
    name: 'White Wolf',
    description: 'Wind’s howling. Still is.',
    match: ['witcher'],
  },
  {
    id: 'sig_bullet_heaven',
    sourceLabel: 'Vampire Survivors',
    name: 'Bullet Heaven',
    description: 'Just one run. You have said this before.',
    match: ['vampire survivors', 'halls of torment', 'soulstone survivors'],
  },
  {
    id: 'sig_hallownest',
    sourceLabel: 'Hollow Knight',
    name: 'Knight of Hallownest',
    description: 'Still wandering the ruins, still finding secrets.',
    match: ['hollow knight'],
  },
  {
    id: 'sig_keep_on_truckin',
    sourceLabel: 'a truck simulator',
    name: "Keep on Truckin'",
    description: 'The open road, delivered cargo, complete calm.',
    match: ['euro truck', 'american truck'],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getGameMinutes = (game) => {
  const raw = game?.time_played ?? game?.playtime?.total ?? 0;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : 0;
};

const matchesTitle = (title, game) => {
  const normalized = normalizeName(game?.name || game?.title);
  if (!normalized) return false;
  return title.match.some((pattern) => normalized.includes(pattern));
};

const buildMeta = (reward, game, minutes) => {
  const required = reward.requiredMinutes || DEFAULT_REQUIRED_MINUTES;
  const unlocked = minutes >= required;
  const gameName = game?.name || game?.title || reward.sourceLabel;
  return {
    ...reward,
    signature: true,
    unlockedBy: 'game',
    category: 'Title',
    gameName,
    requiredXP: 0,
    requiredMinutes: required,
    earnedMinutes: Math.round(minutes),
    unlocked,
    progressPercent: Math.min(100, Math.round((minutes / required) * 100)),
    unlockHint: unlocked
      ? `Earned with ${Math.floor(minutes / 60)}h of ${gameName}.`
      : minutes > 0
        ? `${Math.ceil((required - minutes) / 60)}h more of ${gameName} to unlock.`
        : `Play ${Math.round(required / 60)}h+ of ${reward.sourceLabel} to unlock.`,
  };
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SignatureTitleService {
  /**
   * All signature/devotion titles with unlock state computed from the library.
   * Returns entries shaped like ProgressionUnlockService title rewards so they
   * merge into the same catalog and equip flow.
   */
  static getSignatureTitles(library) {
    const games = Array.isArray(library) ? library : StorageService.get('library', []) || [];
    const safeGames = Array.isArray(games) ? games : [];

    const results = [];
    const curatedGameKeys = new Set();

    SIGNATURE_TITLES.forEach((title) => {
      // A title can match several games (e.g. multiple souls games) — count the
      // combined minutes across all of them so the series behaves as one badge.
      const matching = safeGames.filter((game) => matchesTitle(title, game));
      matching.forEach((game) => curatedGameKeys.add(normalizeName(game?.name || game?.title)));
      const minutes = matching.reduce((acc, game) => acc + getGameMinutes(game), 0);
      const bestGame = matching.sort((a, b) => getGameMinutes(b) - getGameMinutes(a))[0] || null;
      const sourceLabel = title.sourceLabel || bestGame?.name || bestGame?.title || title.match[0];
      results.push(buildMeta({ ...title, sourceLabel }, bestGame, minutes));
    });

    // Generated devotion titles for games with deep play but no curated title.
    safeGames.forEach((game) => {
      const key = normalizeName(game?.name || game?.title);
      if (!key || curatedGameKeys.has(key)) return;
      const minutes = getGameMinutes(game);
      const name = shortenName(game?.name || game?.title);
      if (minutes >= LEGEND_MINUTES) {
        results.push(
          buildMeta(
            {
              id: `devotion_legend_${key.replace(/\s+/g, '_')}`,
              name: `${name} Legend`,
              description: `${Math.floor(minutes / 60)} hours in ${game?.name || game?.title}. That's not a game, that's a residency.`,
              sourceLabel: game?.name || game?.title,
              requiredMinutes: LEGEND_MINUTES,
            },
            game,
            minutes
          )
        );
      } else if (minutes >= DEVOTEE_MINUTES) {
        results.push(
          buildMeta(
            {
              id: `devotion_${key.replace(/\s+/g, '_')}`,
              name: `${name} Devotee`,
              description: `${Math.floor(minutes / 60)} hours in ${game?.name || game?.title}. You know it better than most.`,
              sourceLabel: game?.name || game?.title,
              requiredMinutes: DEVOTEE_MINUTES,
            },
            game,
            minutes
          )
        );
      }
    });

    // Unlocked first (earned ones deserve the top of the grid), then by how
    // close the player is to earning each title.
    return results.sort(
      (a, b) =>
        Number(b.unlocked) - Number(a.unlocked) || b.progressPercent - a.progressPercent || a.name.localeCompare(b.name)
    );
  }

  /** The signature title earned for a specific game name, if any. */
  static getTitleForGame(gameName, library) {
    if (!gameName) return null;
    return (
      this.getSignatureTitles(library).find(
        (title) => title.unlocked && normalizeName(title.gameName) === normalizeName(gameName)
      ) || null
    );
  }
}

export default SignatureTitleService;
