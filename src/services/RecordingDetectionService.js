import StorageService from './StorageService';

const STORAGE_KEY = 'recording_detection_cache';

let memoryCache = null;
const statsCache = new Map();

const loadCache = () => {
  if (memoryCache) return memoryCache;
  try {
    memoryCache = StorageService.get(STORAGE_KEY, {}) || {};
  } catch {
    memoryCache = {};
  }
  return memoryCache;
};

const persistCache = () => {
  try {
    StorageService.set(STORAGE_KEY, memoryCache || {});
  } catch {}
};

const KNOWN_RECORDING_PROCESSES = [
  'obs64.exe',
  'obs32.exe',
  'streamlabs obs.exe',
  'nvcontainer.exe',
  'nvidia share.exe',
  'geforce experience.exe',
  'amd relive.exe',
  'bandicam.exe',
  'fraps.exe',
  'xsplit.core.exe',
  'xsplit.gamecaster.exe',
  'medal.exe',
  'outplayed.exe',
  'xboxgamebar.exe',
  'xgamebar.exe',
  'gamebar.exe',
  'action.exe',
  'mirillis.exe',
  'dxtory.exe',
  'playclaw.exe',
  'vtube studio.exe',
  'vtubestudio.exe'
];

export const RecordingDetectionService = {
  async checkRecordingSoftware() {
    // In Electron, we could use node child_process to check running processes.
    // In browser/dev mode, return a conservative fallback.
    const stored = loadCache();
    const cached = stored._lastCheck;
    if (cached && Date.now() - cached.time < 60000) { // 1 min throttle
      return cached.result;
    }

    // If in Electron with node integration, try to detect
    let detected = [];
    if (typeof window !== 'undefined' && window.electronAPI?.getRunningProcesses) {
      try {
        const processes = await window.electronAPI.getRunningProcesses();
        detected = processes.filter(p =>
          KNOWN_RECORDING_PROCESSES.some(rp =>
            p.name?.toLowerCase() === rp || p.name?.toLowerCase().includes(rp.replace('.exe', ''))
          )
        ).map(p => p.name);
      } catch {
        detected = [];
      }
    }

    const result = {
      isRecording: detected.length > 0,
      detectedApps: [...new Set(detected)],
      timestamp: Date.now()
    };

    stored._lastCheck = { time: Date.now(), result };
    persistCache();
    return result;
  },

  tagSession(gameName, wasRecording) {
    if (!gameName) return;
    const stored = loadCache();
    if (!stored.sessions) stored.sessions = {};
    if (!stored.sessions[gameName]) stored.sessions[gameName] = [];

    stored.sessions[gameName].push({
      timestamp: Date.now(),
      recorded: wasRecording
    });

    // Keep only last 20 entries per game
    stored.sessions[gameName] = stored.sessions[gameName].slice(-20);
    statsCache.delete(gameName);
    persistCache();
  },

  getRecordingStats(gameName) {
    if (!gameName) return { totalSessions: 0, recordedSessions: 0, isContentCreator: false };
    if (statsCache.has(gameName)) {
      return statsCache.get(gameName);
    }
    const sessions = loadCache().sessions?.[gameName] || [];
    let recorded = 0;
    for (const s of sessions) {
      if (s.recorded) recorded += 1;
    }
    const result = {
      totalSessions: sessions.length,
      recordedSessions: recorded,
      isContentCreator: sessions.length > 2 && recorded / sessions.length > 0.5
    };
    statsCache.set(gameName, result);
    return result;
  },

  invalidateCache() {
    memoryCache = null;
    statsCache.clear();
  }
};

export default RecordingDetectionService;
