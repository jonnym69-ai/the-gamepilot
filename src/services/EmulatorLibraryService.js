import { getGameGenres } from '../GameGenreDatabase';
import { getMoodForGame } from '../constants/GenresMoods';
import StorageService from './StorageService';

const EMULATOR_PROFILES_KEY = 'emulatorProfiles';
const DEFAULT_EXTENSIONS = ['iso', 'chd', 'rvz', 'gcm', 'cue', 'bin', 'gba', 'gbc', 'gb', 'nds', '3ds', 'cia', 'n64', 'z64', 'v64', 'sfc', 'smc', 'nes', 'md', 'gen', 'sms', 'gg', 'pce', 'zip', '7z'];

const PLATFORM_FALLBACK_GENRES = {
  'Arcade': ['Arcade', 'Action'],
  'Game Boy': ['Platformer', 'Adventure'],
  'Game Boy Advance': ['RPG', 'Platformer', 'Adventure'],
  'Game Boy Color': ['Platformer', 'Adventure'],
  'GameCube': ['Adventure', 'Action'],
  'Nintendo 64': ['Platformer', 'Adventure'],
  'Nintendo DS': ['RPG', 'Puzzle', 'Adventure'],
  'Nintendo 3DS': ['RPG', 'Adventure'],
  'Nintendo Switch': ['Adventure', 'Action'],
  'PlayStation': ['Action', 'RPG'],
  'PlayStation 2': ['Action', 'RPG'],
  'PlayStation 3': ['Action', 'Adventure'],
  'PSP': ['Action', 'RPG'],
  'SNES': ['Platformer', 'RPG'],
  'NES': ['Platformer', 'Arcade'],
  'Sega Genesis': ['Platformer', 'Action'],
  'Wii': ['Party', 'Adventure'],
  'Wii U': ['Adventure', 'Platformer']
};


const normalizeExtensions = (extensions) => {
  if (Array.isArray(extensions)) {
    return extensions.map((extension) => String(extension || '').replace(/^\./, '').trim().toLowerCase()).filter(Boolean);
  }

  return String(extensions || '')
    .split(',')
    .map((extension) => extension.replace(/^\./, '').trim().toLowerCase())
    .filter(Boolean);
};

const cleanRomName = (fileName = '') => String(fileName)
  .replace(/\.[^.]+$/, '')
  .replace(/\([^)]*\)/g, ' ')
  .replace(/\[[^\]]*\]/g, ' ')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const createTrackedDefaults = () => ({
  time_played: 0,
  launch_count: 0,
  last_played: null,
  playtime: {
    total: 0,
    daily: {},
    weekly: {},
    monthly: {},
    yearly: {}
  }
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
      extensions: normalizeExtensions(profile.extensions).length > 0 ? normalizeExtensions(profile.extensions) : DEFAULT_EXTENSIONS,
      launchTemplate: String(profile.launchTemplate || '"{emulator}" "{rom}"').trim()
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
      extensions: profile.extensions || DEFAULT_EXTENSIONS
    });

    if (!Array.isArray(roms)) {
      return [];
    }

    return roms.map((rom) => this.createGameFromRom(profile, rom)).filter(Boolean);
  }

  static async scanAllProfiles() {
    const profiles = this.getProfiles();
    const results = await Promise.all(profiles.map((profile) => this.scanProfile(profile)));
    return results.flat();
  }

  static createGameFromRom(profile, rom) {
    const name = cleanRomName(rom.name || rom.fileName || rom.path || 'Emulated Game');
    const detectedGenres = getGameGenres(name);
    const fallbackGenres = PLATFORM_FALLBACK_GENRES[profile.consolePlatform] || ['Adventure'];
    const genres = detectedGenres.length > 0 ? detectedGenres : fallbackGenres;
    return {
      name,
      platform: 'Emulated',
      brandPlatform: profile.consolePlatform || 'Emulated',
      source: 'emulator',
      launchType: 'emulator',
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
      genres,
      mood: getMoodForGame(genres) || 'Escapist',
      ...createTrackedDefaults()
    };
  }

  static getDefaultExtensions() {
    return DEFAULT_EXTENSIONS;
  }
}

export default EmulatorLibraryService;
