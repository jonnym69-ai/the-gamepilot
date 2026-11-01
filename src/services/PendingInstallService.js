import StorageService from './StorageService';
import { getElectronAPI } from './ElectronBridge';

/**
 * Tracks installs kicked off from the "Owned, not installed" section.
 * Entries live in localStorage with a 48-hour TTL and are mirrored to the
 * main-process install watcher, which polls Steam/Epic/GOG install markers
 * and emits `gamepilot:game-installed` when one lands.
 */

const STORAGE_KEY = 'pending-installs-v1';
const TTL_MS = 48 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;

const keyFor = (game) => {
  if (!game || typeof game !== 'object') return null;
  const source = ['steam', 'epic', 'gog'].includes(game.source) ? game.source : null;
  const id = game.appid || game.appName || game.gogProductId || null;
  return source && id ? `${source}:${id}` : null;
};

const toEntry = (game) => {
  const key = keyFor(game);
  if (!key) return null;
  const image = game.icon || game.image;
  return {
    key,
    source: game.source,
    name: String(game.name || '').slice(0, 200),
    image: typeof image === 'string' && /^https:\/\//.test(image) ? image : null,
    appid: game.appid ? String(game.appid) : undefined,
    appName: typeof game.appName === 'string' ? game.appName : undefined,
    catalogItemId: typeof game.catalogItemId === 'string' ? game.catalogItemId : undefined,
    gogProductId: game.gogProductId ? String(game.gogProductId) : undefined,
    markedAt: Date.now(),
  };
};

const read = () => {
  const list = StorageService.get(STORAGE_KEY, []);
  return Array.isArray(list) ? list.filter((entry) => entry && typeof entry.key === 'string') : [];
};

const write = (entries) => {
  StorageService.set(STORAGE_KEY, entries.slice(0, MAX_ENTRIES));
};

/** Drop entries past the TTL and return the survivors. */
const prune = () => {
  const now = Date.now();
  const kept = read().filter((entry) => now - (entry.markedAt || 0) <= TTL_MS);
  if (kept.length !== read().length) write(kept);
  return kept;
};

/** Push the current pruned list to the main-process watcher. */
const sync = () => {
  try {
    const api = getElectronAPI();
    if (api && typeof api.installWatchSet === 'function') {
      api.installWatchSet(prune()).catch(() => {});
    }
  } catch {
    // Bridge unavailable — pending set still persists locally.
  }
};

const list = () => prune();

const add = (game) => {
  const entry = toEntry(game);
  if (!entry) return null;
  const entries = prune().filter((existing) => existing.key !== entry.key);
  entries.push(entry);
  write(entries);
  sync();
  return entry;
};

const remove = (key) => {
  if (!key) return;
  const entries = prune().filter((entry) => entry.key !== key);
  write(entries);
  sync();
};

const clear = () => {
  write([]);
  sync();
};

/**
 * Fire the launcher deep-link for an owned game and, when it opens,
 * register the game as pending so the install watcher catches it landing.
 * Shared by NotInstalledSection and the Recs backlog shelf.
 */
const installOwnedGame = async (game) => {
  const api = getElectronAPI();
  if (!api || !game) return false;
  try {
    let opened = false;
    if (game.source === 'steam' && game.appid && typeof api.steamInstall === 'function') {
      opened = await api.steamInstall(String(game.appid));
    } else if (game.source === 'epic' && game.appName && typeof api.epicOpenApp === 'function') {
      opened = await api.epicOpenApp(game.appName);
    } else if (game.source === 'gog' && game.gogProductId && typeof api.gogOpenInGalaxy === 'function') {
      opened = await api.gogOpenInGalaxy(String(game.gogProductId));
    }
    if (opened) add(game);
    return opened;
  } catch {
    return false;
  }
};

const PendingInstallService = { keyFor, list, add, remove, clear, sync, installOwnedGame, TTL_MS };

export default PendingInstallService;
