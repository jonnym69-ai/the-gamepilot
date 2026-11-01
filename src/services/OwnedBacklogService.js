import StorageService from './StorageService';
import SteamOwnedGamesService from './SteamOwnedGamesService';
import EpicAccountService from './EpicAccountService';
import ItchAccountService from './ItchAccountService';
import OwnedEnrichmentService from './OwnedEnrichmentService';
import { getElectronAPI } from './ElectronBridge';
import { getDateKey } from './DateKeyService';

/**
 * "From your uninstalled backlog" — a small daily rotation of owned games
 * that aren't installed, surfaced on the Recs page. Reuses the same cached
 * owned lists as NotInstalledSection (no extra network), ranks Steam games
 * with real playtime first, and rotates a stable window through the pool
 * day by day.
 */

const DISMISSED_KEY = 'owned-backlog-dismissed-v1';
const PICKS_PER_DAY = 4;
const DAY_MS = 86400000;

const keyFor = (game) => {
  if (!game || typeof game !== 'object') return null;
  const source = ['steam', 'epic', 'gog', 'itch'].includes(game.source) ? game.source : null;
  const id = game.appid || game.appName || game.gogProductId || game.itchId || null;
  return source && id ? `${source}:${id}` : null;
};

const getDismissed = () => {
  const list = StorageService.get(DISMISSED_KEY, []);
  return new Set(Array.isArray(list) ? list : []);
};

const dismiss = (game) => {
  const key = keyFor(game);
  if (!key) return;
  const dismissed = getDismissed();
  dismissed.add(key);
  StorageService.set(DISMISSED_KEY, Array.from(dismissed).slice(-500));
};

const normalizeName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

/**
 * Merge all three owned sources and diff against the installed library.
 * Sources that aren't configured return empty. Errors from one source
 * never blank the others.
 */
const getPool = async (library) => {
  const installed = Array.isArray(library) ? library : [];
  const installedNames = installed.map((game) => game?.name).filter(Boolean);
  const merged = [];

  try {
    if (SteamOwnedGamesService.isEnabled() && SteamOwnedGamesService.getSteamId()) {
      const result = await SteamOwnedGamesService.fetchOwned();
      if (result?.success && Array.isArray(result.games)) {
        merged.push(
          ...SteamOwnedGamesService.diffUninstalled(result.games, installed).map((game) => ({
            ...game,
            source: 'steam',
          }))
        );
      }
    }
  } catch {
    // Steam relay offline — other sources still surface.
  }

  try {
    if (EpicAccountService.isLinked()) {
      const result = await EpicAccountService.getOwned();
      if (result?.success && Array.isArray(result.games)) {
        merged.push(
          ...EpicAccountService.diffUninstalled(result.games, installed).map((game) => ({
            ...game,
            source: 'epic',
          }))
        );
      }
    }
  } catch {
    // Epic bridge unavailable — skip.
  }

  try {
    const api = getElectronAPI();
    if (api && typeof api.gogUninstalled === 'function') {
      const result = await api.gogUninstalled(installedNames);
      if (result?.ok && Array.isArray(result.games)) {
        const seenNames = new Set(installedNames.map(normalizeName));
        merged.push(
          ...result.games
            .filter((game) => game?.name && !seenNames.has(normalizeName(game.name)))
            .map((game) => ({ ...game, source: 'gog' }))
        );
      }
    }
  } catch {
    // No local Galaxy data — skip.
  }

  try {
    if (ItchAccountService.isConfigured()) {
      const result = await ItchAccountService.getOwned();
      if (result?.success && Array.isArray(result.games)) {
        merged.push(
          ...ItchAccountService.diffUninstalled(result.games, installed).map((game) => ({
            ...game,
            source: 'itch',
          }))
        );
      }
    }
  } catch {
    // itch key unset or API down — skip.
  }

  const dismissed = getDismissed();
  return OwnedEnrichmentService.enrichGames(merged)
    .filter((game) => {
      const key = keyFor(game);
      return key && !dismissed.has(key);
    })
    .sort(
      (a, b) =>
        (b.playtimeForever || 0) - (a.playtimeForever || 0) ||
        (Number(b.lastPlayed) || 0) - (Number(a.lastPlayed) || 0) ||
        String(a.name).localeCompare(String(b.name))
    );
};

/**
 * A stable day-seeded window through the ranked pool — same picks all day,
 * advances daily. Wraps around the pool so small libraries still fill.
 */
const picksForDay = (pool, date = new Date(), count = PICKS_PER_DAY) => {
  if (!Array.isArray(pool) || pool.length === 0) return [];
  const day = getDateKey(date);
  const ordinal = day ? Math.floor(Date.parse(`${day}T00:00:00Z`) / DAY_MS) : 0;
  const start = pool.length > 0 ? ordinal % pool.length : 0;
  const picks = [];
  for (let index = 0; index < Math.min(count, pool.length); index += 1) {
    picks.push(pool[(start + index) % pool.length]);
  }
  return picks;
};

const OwnedBacklogService = { keyFor, getPool, picksForDay, dismiss, PICKS_PER_DAY };

export default OwnedBacklogService;
