import { getGameGenres } from '../GameGenreDatabase';
import { getMoodForGame } from '../constants/GenresMoods';
import StorageService from './StorageService';

const EMULATOR_PROFILES_KEY = 'emulatorProfiles';
const DEFAULT_EXTENSIONS = [
  'iso',
  'chd',
  'rvz',
  'gcm',
  'cue',
  'bin',
  'gba',
  'gbc',
  'gb',
  'nds',
  '3ds',
  'cia',
  'n64',
  'z64',
  'v64',
  'sfc',
  'smc',
  'nes',
  'md',
  'gen',
  'sms',
  'gg',
  'pce',
  'zip',
  '7z',
];

const PLATFORM_FALLBACK_GENRES = {
  Arcade: ['Arcade', 'Action'],
  'Game Boy': ['Platformer', 'Adventure'],
  'Game Boy Advance': ['RPG', 'Platformer', 'Adventure'],
  'Game Boy Color': ['Platformer', 'Adventure'],
  GameCube: ['Adventure', 'Action'],
  'Nintendo 64': ['Platformer', 'Adventure'],
  'Nintendo DS': ['RPG', 'Puzzle', 'Adventure'],
  'Nintendo 3DS': ['RPG', 'Adventure'],
  'Nintendo Switch': ['Adventure', 'Action'],
  PlayStation: ['Action', 'RPG'],
  'PlayStation 2': ['Action', 'RPG'],
  'PlayStation 3': ['Action', 'Adventure'],
  PSP: ['Action', 'RPG'],
  SNES: ['Platformer', 'RPG'],
  NES: ['Platformer', 'Arcade'],
  'Sega Genesis': ['Platformer', 'Action'],
  Wii: ['Party', 'Adventure'],
  'Wii U': ['Adventure', 'Platformer'],
};

const normalizeExtensions = (extensions) => {
  if (Array.isArray(extensions)) {
    return extensions
      .map((extension) =>
        String(extension || '')
          .replace(/^\./, '')
          .trim()
          .toLowerCase()
      )
      .filter(Boolean);
  }

  return String(extensions || '')
    .split(',')
    .map((extension) => extension.replace(/^\./, '').trim().toLowerCase())
    .filter(Boolean);
};

const cleanRomName = (fileName = '') =>
  String(fileName)
    .replace(/\.[^.]+$/, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// No-Intro/TOSEC-style region tags live inside the bracketed parts of the
// filename: (USA), (Europe), (World), (J), [U], (USA, Europe) etc. Preference
// order mirrors what most players actually want installed.
const ROM_REGION_TAGS = {
  usa: /\b(usa|united states|u\.s\.a|u)\b/i,
  world: /\bworld\b/i,
  europe: /\b(europe|eur|e)\b/i,
  japan: /\b(japan|jp|j)\b/i,
};
const ROM_REGION_PREFERENCE = ['usa', 'world', 'europe', 'japan'];

const extractRomRegion = (fileName = '') => {
  const tags = String(fileName).match(/\([^)]*\)|\[[^\]]*\]/g) || [];
  const haystack = tags.join(' ');
  return ROM_REGION_PREFERENCE.find((region) => ROM_REGION_TAGS[region].test(haystack)) || null;
};

// Dedupe key: like cleanRomName but keeps disc/side tags so "FFVII (Disc 1)"
// and "(Disc 2)" stay separate entries while (USA)/(Europe) collapse.
const romDedupeKey = (fileName = '') =>
  String(fileName)
    .replace(/\.[^.]+$/, '')
    .replace(/\(([^)]*)\)/g, (match, inner) => (/\b(disc|disk|side|tape|part)\b/i.test(inner) ? match : ' '))
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

// Within a stem, launcher formats beat payload files: a .cue/.gdi/.m3u is the
// bootable entry next to its .bin/.cdi tracks.
const FORMAT_RANK = { cue: 0, gdi: 0, m3u: 0, chd: 1, rvz: 1, iso: 2, zip: 3, '7z': 3 };
const formatRank = (ext) => FORMAT_RANK[String(ext || '').toLowerCase()] ?? 2;

// Collapse region/format variants of the same title down to one entry: prefer
// the best region, then a launcher format, then a deterministic filename order
// — so the library shows "Chrono Trigger" once instead of USA+Europe+Japan rows.
const dedupeRomsByTitle = (roms = []) => {
  const byName = new Map();
  (Array.isArray(roms) ? roms : []).forEach((rom) => {
    const fileName = String(rom?.name || rom?.fileName || rom?.path || '');
    const name = cleanRomName(fileName);
    const key = romDedupeKey(fileName);
    if (!name || !key) return;
    const region = extractRomRegion(fileName);
    const regionRank = region ? ROM_REGION_PREFERENCE.indexOf(region) : ROM_REGION_PREFERENCE.length;
    const ext = String(rom?.extension || fileName.split('.').pop() || '').toLowerCase();
    const candidate = { rom, name, region, regionRank, formatRank: formatRank(ext), fileName };
    const current = byName.get(key);
    if (
      !current ||
      candidate.regionRank < current.regionRank ||
      (candidate.regionRank === current.regionRank && candidate.formatRank < current.formatRank) ||
      (candidate.regionRank === current.regionRank &&
        candidate.formatRank === current.formatRank &&
        candidate.fileName < current.fileName)
    ) {
      byName.set(key, candidate);
    }
  });
  return [...byName.values()];
};

// libretro's public thumbnail CDN is keyless — same treatment as Steam CDN art.
// System folder names come from the libretro-thumbnails repo; filename rules:
// `&*/:<>?\|"` become `_` in the title.
const LIBRETRO_THUMBNAIL_BASE = 'https://thumbnails.libretro.com';
const LIBRETRO_SYSTEMS = {
  NES: 'Nintendo - Nintendo Entertainment System',
  SNES: 'Nintendo - Super Nintendo Entertainment System',
  'Nintendo 64': 'Nintendo - Nintendo 64',
  'Nintendo DS': 'Nintendo - Nintendo DS',
  'Nintendo 3DS': 'Nintendo - Nintendo 3DS',
  'Nintendo Switch': 'Nintendo - Nintendo Switch',
  GameCube: 'Nintendo - GameCube',
  Wii: 'Nintendo - Wii',
  'Wii U': 'Nintendo - Wii U',
  'Game Boy': 'Nintendo - Game Boy',
  'Game Boy Color': 'Nintendo - Game Boy Color',
  'Game Boy Advance': 'Nintendo - Game Boy Advance',
  PlayStation: 'Sony - PlayStation',
  'PlayStation 2': 'Sony - PlayStation 2',
  'PlayStation 3': 'Sony - PlayStation 3',
  PSP: 'Sony - PlayStation Portable',
  'Sega Genesis': 'Sega - Mega Drive - Genesis',
  'Master System': 'Sega - Master System - Mark III',
  'Game Gear': 'Sega - Game Gear',
  Saturn: 'Sega - Saturn',
  Dreamcast: 'Sega - Dreamcast',
  'PC Engine': 'NEC - PC Engine - TurboGrafx 16',
  Arcade: 'MAME',
};

const LIBRETRO_UNSAFE_CHARS = /[&*/:<>?\\|"]/g;

// Thumbnails are catalogued under the full DAT-style name including region
// tags, e.g. "Chrono Trigger (USA).png" — so build from the raw file stem,
// not the cleaned display name.
const getLibretroThumbUrl = (consolePlatform, romStem, pack = 'Named_Boxarts') => {
  const system = LIBRETRO_SYSTEMS[consolePlatform];
  const stem = String(romStem || '')
    .replace(LIBRETRO_UNSAFE_CHARS, '_')
    .trim();
  if (!system || !stem) return '';
  return `${LIBRETRO_THUMBNAIL_BASE}/${encodeURIComponent(system)}/${pack}/${encodeURIComponent(stem)}.png`;
};

const createTrackedDefaults = () => ({
  time_played: 0,
  launch_count: 0,
  last_played: null,
  playtime: {
    total: 0,
    daily: {},
    weekly: {},
    monthly: {},
    yearly: {},
  },
});

export class EmulatorLibraryService {
  static getProfiles() {
    const profiles = StorageService.get(EMULATOR_PROFILES_KEY, []);
    return Array.isArray(profiles) ? profiles : [];
  }

  static saveProfiles(profiles = []) {
    StorageService.set(EMULATOR_PROFILES_KEY, Array.isArray(profiles) ? profiles : []);
  }

  static addProfile(profile = {}) {
    const profiles = this.getProfiles();
    const nextProfile = {
      id: profile.id || `emu_${Date.now()}`,
      name: String(profile.name || 'Emulator').trim(),
      consolePlatform: String(profile.consolePlatform || 'Emulated').trim(),
      emulatorPath: String(profile.emulatorPath || '').trim(),
      romFolder: String(profile.romFolder || '').trim(),
      extensions:
        normalizeExtensions(profile.extensions).length > 0
          ? normalizeExtensions(profile.extensions)
          : DEFAULT_EXTENSIONS,
      launchTemplate: String(profile.launchTemplate || '"{emulator}" "{rom}"').trim(),
    };

    this.saveProfiles([...profiles.filter((item) => item.id !== nextProfile.id), nextProfile]);
    return nextProfile;
  }

  static removeProfile(profileId) {
    this.saveProfiles(this.getProfiles().filter((profile) => profile.id !== profileId));
  }

  static async scanProfile(profile) {
    if (!profile?.romFolder || !window.electronAPI?.scanEmulatorRoms) {
      return [];
    }

    const roms = await window.electronAPI.scanEmulatorRoms({
      romFolder: profile.romFolder,
      extensions: profile.extensions || DEFAULT_EXTENSIONS,
    });

    if (!Array.isArray(roms)) {
      return [];
    }

    return dedupeRomsByTitle(roms)
      .map(({ rom, name, region }) => this.createGameFromRom(profile, rom, { name, region }))
      .filter(Boolean);
  }

  static async scanAllProfiles() {
    const profiles = this.getProfiles();
    const results = await Promise.all(profiles.map((profile) => this.scanProfile(profile)));
    return results.flat();
  }

  static createGameFromRom(profile, rom, options = {}) {
    const rawStem = String(rom.name || rom.fileName || rom.path || '').replace(/\.[^.]+$/, '');
    const name = options.name || cleanRomName(rom.name || rom.fileName || rom.path || 'Emulated Game');
    const detectedGenres = getGameGenres(name);
    const fallbackGenres = PLATFORM_FALLBACK_GENRES[profile.consolePlatform] || ['Adventure'];
    const genres = detectedGenres.length > 0 ? detectedGenres : fallbackGenres;
    return {
      name,
      platform: 'Emulated',
      brandPlatform: profile.consolePlatform || 'Emulated',
      source: 'emulator',
      launchType: 'emulator',
      region: options.region || null,
      emulator: profile.name,
      emulatorProfileId: profile.id,
      emulatorPath: profile.emulatorPath,
      romPath: rom.path,
      installDir: profile.romFolder,
      executablePath: profile.emulatorPath,
      executable: profile.launchTemplate || '"{emulator}" "{rom}"',
      launchId: `${profile.id}:${rom.path}`,
      iconUrl: '',
      icon: '',
      coverImage: getLibretroThumbUrl(profile.consolePlatform, rawStem),
      genres,
      mood: getMoodForGame(genres) || 'Competitive',
      ...createTrackedDefaults(),
    };
  }

  static getDefaultExtensions() {
    return DEFAULT_EXTENSIONS;
  }
}

export default EmulatorLibraryService;
