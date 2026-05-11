// PCGamingWikiService.js
// Renderer-side wrapper around an Electron-main IPC bridge that queries the
// public PCGamingWiki MediaWiki API. Surfaces librarian-grade facts:
//   - Save game data path (Windows)
//   - Configuration file path (Windows)
//   - Native controller support summary
//   - A canonical link back to the wiki page
// Local-first posture: no GamePilot backend involved; results cached on-device
// with a 30-day TTL, opt-out switch lives in Settings.

import StorageService from './StorageService';

// Bumped V1 -> V2 when the hybrid Steam-AppID + normalized-title resolver
// shipped, so stale negatives from the v1 single-tier lookup don't shadow it.
const CACHE_KEY = 'pcgwCacheV2';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PENDING_TTL_MS = 6 * 60 * 60 * 1000; // misses re-try after 6h
const SETTINGS_KEY = 'pcgwEnabled';

const inflight = new Map();

const slug = (s) => String(s || '')
  .toLowerCase()
  .replace(/[\u00ae\u2122\u00a9]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const gameKeyFor = (game) => {
  if (!game) return '';
  return slug(game.name || game.title || '');
};

const readCache = () => {
  try {
    const raw = StorageService.getString(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeCache = (cache) => {
  try { StorageService.set(CACHE_KEY, cache); }
  catch (err) { console.warn('[PCGW] cache write failed:', err); }
};

const isFresh = (entry) => {
  if (!entry || !entry.fetchedAt) return false;
  const ttl = entry.found ? TTL_MS : PENDING_TTL_MS;
  return Date.now() - entry.fetchedAt < ttl;
};

// --- Wikitext extractors -----------------------------------------------------
// PCGamingWiki articles use known templates. We pull a few high-value bits.

const stripWiki = (s) => String(s || '')
  // {{P|steam|123}} -> steam:123 (we don't really need this, just clean it)
  .replace(/\{\{P\|[^}]+\}\}/gi, '')
  // [[Foo|Bar]] -> Bar; [[Foo]] -> Foo
  .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
  .replace(/\[\[([^\]]+)\]\]/g, '$1')
  // bold/italic
  .replace(/'''/g, '')
  .replace(/''/g, '')
  // <code>...</code>, <kbd>...</kbd>
  .replace(/<\/?(code|kbd|tt|small)>/gi, '')
  // tags we don't care about
  .replace(/<ref[^>]*\/>/gi, '')
  .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
  .replace(/\{\{key\|([^}]+)\}\}/gi, '$1')
  .replace(/\s+/g, ' ')
  .trim();

const extractGameDataPath = (wikitext, sectionName) => {
  if (!wikitext) return null;
  // Find the "==<sectionName>==" heading in Save game data location / Configuration file(s) location
  const idx = wikitext.search(new RegExp(`==\\s*${sectionName}\\s*==`, 'i'));
  if (idx < 0) return null;
  const slice = wikitext.slice(idx, idx + 3000);
  // Templates of the form {{Game data/saves|Windows|<path>}} or
  // {{Game data|Windows|<path>}}.
  const re = /\{\{Game data(?:\/(?:saves|config))?\s*\|\s*Windows\s*\|\s*([^}|]+?)\s*(?:\||\}\})/i;
  const m = slice.match(re);
  if (!m) return null;
  const cleaned = stripWiki(m[1]);
  return cleaned || null;
};

const extractControllerSupport = (wikitext) => {
  if (!wikitext) return null;
  // Look for the {{Controller support|...}} block or a {{Input...}} table.
  const block = wikitext.match(/\{\{Input(?:[\s\S]{0,1500})?\}\}/i);
  const result = {};
  const findRow = (label) => {
    const re = new RegExp(`\\|\\s*${label}\\s*=\\s*([^\\n|]+)`, 'i');
    const src = block ? block[0] : wikitext;
    const m = src.match(re);
    if (!m) return null;
    const v = stripWiki(m[1]).toLowerCase();
    if (!v) return null;
    if (v.includes('true') || v === 'yes' || v === 'native') return 'yes';
    if (v.includes('hackable') || v.includes('limited') || v.includes('partial')) return 'limited';
    if (v.includes('false') || v === 'no' || v === 'unknown') return 'no';
    return v;
  };
  result.fullController = findRow('full controller support');
  result.controllerRemap = findRow('controller remapping');
  result.xinput = findRow('xinput-compatible controllers');
  result.playstation = findRow('playstation controllers');
  // If everything is null, return null so UI can hide.
  if (!result.fullController && !result.xinput && !result.playstation) return null;
  return result;
};

const buildEntry = (apiResult) => {
  const now = Date.now();
  if (!apiResult || !apiResult.ok) {
    // If the page exists but had no wikitext (stub), still surface the URL so
    // the user can jump to PCGW and contribute.
    if (apiResult?.error === 'no-wikitext' && apiResult.pageUrl) {
      return {
        found: true,
        stub: true,
        fetchedAt: now,
        pageTitle: apiResult.pageTitle || null,
        pageUrl: apiResult.pageUrl
      };
    }
    return { found: false, fetchedAt: now, error: apiResult?.error || 'unknown' };
  }
  const { pageTitle, pageUrl, wikitext, matchedVia } = apiResult;
  if (!pageTitle || !wikitext) {
    return { found: false, fetchedAt: now, error: 'no-page' };
  }
  const saveLocation = extractGameDataPath(wikitext, 'Save game data location');
  const configLocation =
    extractGameDataPath(wikitext, 'Configuration file\\(s\\) location')
    || extractGameDataPath(wikitext, 'Configuration files? location');
  const controller = extractControllerSupport(wikitext);
  const isStub = !saveLocation && !configLocation && !controller;
  return {
    found: true,
    stub: isStub,
    fetchedAt: now,
    pageTitle,
    pageUrl,
    matchedVia: matchedVia || null,
    saveLocation,
    configLocation,
    controller
  };
};

class PCGamingWikiService {
  static isEnabled() {
    const raw = StorageService.getString(SETTINGS_KEY);
    if (raw === null || raw === undefined || raw === '') return true;
    return raw === 'true' || raw === true;
  }

  static setEnabled(enabled) {
    StorageService.set(SETTINGS_KEY, Boolean(enabled));
  }

  static getCached(game) {
    const key = gameKeyFor(game);
    if (!key) return null;
    return readCache()[key] || null;
  }

  static async lookup(game, { force = false } = {}) {
    const key = gameKeyFor(game);
    const name = game?.name || game?.title || '';
    if (!key || !name) return null;
    if (!this.isEnabled()) return this.getCached(game);

    const cache = readCache();
    const cached = cache[key];
    if (!force && cached && isFresh(cached)) return cached;
    if (inflight.has(key)) return inflight.get(key);

    const api = (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.pcgwLookup)
      ? window.electronAPI.pcgwLookup
      : null;
    if (!api) return cached || null;

    const appid = game?.appid || game?.steam_appid || game?.appId || null;
    const promise = (async () => {
      try {
        const result = await api({ name, appid });
        const entry = buildEntry(result);
        const next = { ...readCache(), [key]: entry };
        writeCache(next);
        return entry;
      } catch (err) {
        console.warn('[PCGW] lookup failed:', err);
        return cached || null;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, promise);
    return promise;
  }
}

export default PCGamingWikiService;
export { gameKeyFor as pcgwGameKey };
