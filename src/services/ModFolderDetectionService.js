import StorageService from './StorageService';

const DETECTION_KEY = 'mod_folder_detection';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// In-memory cache so repeated calls during a render pass don't hit localStorage.
let memoryCache = null;
let pendingFlush = null;

const loadMemoryCache = () => {
  if (memoryCache) return memoryCache;
  try {
    memoryCache = StorageService.get(DETECTION_KEY, {}) || {};
  } catch {
    memoryCache = {};
  }
  return memoryCache;
};

const scheduleFlush = () => {
  if (pendingFlush) return;
  const run = () => {
    pendingFlush = null;
    try {
      StorageService.set(DETECTION_KEY, memoryCache || {});
    } catch {}
  };
  if (typeof window !== 'undefined' && window.requestIdleCallback) {
    pendingFlush = window.requestIdleCallback(run, { timeout: 2000 });
  } else {
    pendingFlush = setTimeout(run, 500);
  }
};

const KNOWN_MOD_FOLDERS = [
  'mods',
  'mod',
  'Modding',
  'BepInEx',
  'MelonLoader',
  'SMAPI',
  'Vortex',
  'NexusMods',
  'CurseForge',
  'Thunderstore',
  'plugins',
  'addons',
  'addon',
  'CustomScripts',
  'ScriptHookV',
  'SKSE',
  'F4SE',
  'NVSE',
  'OBSE',
  'MWSE',
  'DLSSTweaks',
  'ReShade',
  ' reshade',
  'ReShade-shaders',
  'dinput8',
  'asi',
  'asi-loader'
];

const KNOWN_MOD_FILES = [
  'bepinex.dll',
  'melonloader.dll',
  'doorstop.dll',
  'winhttp.dll',
  'doorstop_config.ini',
  'BepInEx.cfg',
  'vortex.deployment.json',
  'mods.json',
  'modlist.txt',
  'loadorder.txt'
];

// Pre-lowercased lookup arrays so we don't lowercase per-call.
const MOD_FOLDERS_LOWER = KNOWN_MOD_FOLDERS.map(f => f.toLowerCase());
const MOD_FILES_LOWER = KNOWN_MOD_FILES.map(f => f.toLowerCase());

export const ModFolderDetectionService = {
  detectModded(game) {
    const installPath = game.path || game.installPath || game.gameDir;
    if (!installPath) return { modded: false, indicators: [] };

    const cache = loadMemoryCache();
    const cacheKey = game.name || game.appname || game.appid;
    const cached = cache[cacheKey];
    if (cached && Date.now() - cached.checkedAt < CACHE_TTL_MS) {
      return cached.result;
    }

    const indicators = [];
    const pathLower = installPath.toLowerCase();

    for (let i = 0; i < MOD_FOLDERS_LOWER.length; i += 1) {
      if (pathLower.includes(MOD_FOLDERS_LOWER[i])) {
        indicators.push(KNOWN_MOD_FOLDERS[i]);
      }
    }
    for (let i = 0; i < MOD_FILES_LOWER.length; i += 1) {
      if (pathLower.includes(MOD_FILES_LOWER[i])) {
        indicators.push(KNOWN_MOD_FILES[i]);
      }
    }

    const result = {
      modded: indicators.length > 0,
      indicators: indicators.length > 5 ? Array.from(new Set(indicators)).slice(0, 5) : indicators,
      installPath
    };

    cache[cacheKey] = { result, checkedAt: Date.now() };
    scheduleFlush();
    return result;
  },

  getModdedCount(library) {
    let count = 0;
    for (const game of library) {
      if (this.detectModded(game).modded) count += 1;
    }
    return count;
  },

  invalidateCache() {
    memoryCache = null;
  }
};

export default ModFolderDetectionService;
