const { httpsRequest } = require('./net');

// ---------------------------------------------------------------------------
// PCGamingWiki MediaWiki bridge.
// Public, anonymous, no API key required. We use opensearch to find a page
// title from the user's game name, then `action=parse` (prop=wikitext) to pull
// the page source. The renderer extracts save/config/controller bits locally.
// ---------------------------------------------------------------------------
const PCGW_HOST = 'www.pcgamingwiki.com';
const PCGW_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 GamePilot/1.4 (+local-first librarian app)';

const pcgwApiGet = async (params) => {
  const qs = new URLSearchParams({ format: 'json', ...params }).toString();
  const res = await httpsRequest(`https://${PCGW_HOST}/w/api.php?${qs}`, null, {
    'User-Agent': PCGW_UA,
    Accept: 'application/json',
  });
  if (res.status !== 200) throw new Error(`pcgw-http-${res.status}`);
  return JSON.parse(res.body);
};

// Strip trademark symbols, edition suffixes, year/platform parentheticals so
// PCGW's opensearch is more likely to land on the canonical page.
const normalizePcgwTitle = (raw) => {
  if (!raw) return '';
  let t = String(raw)
    .replace(/[\u00ae\u2122\u00a9]/g, '')
    .replace(/\s*\((?:steam|epic|gog|origin|ea app|ubisoft|xbox|microsoft store|pc|windows|\d{4})\)\s*/gi, ' ')
    .replace(
      /[:\-\u2013\u2014]\s*(?:game of the year(?:\s+edition)?|goty(?:\s+edition)?|definitive edition|complete edition|deluxe edition|gold edition|ultimate edition|enhanced edition|legendary edition|director'?s cut|anniversary edition|remastered(?:\s+edition)?|remaster|hd|hd remaster|standard edition|special edition)\s*$/gi,
      ''
    )
    .replace(/\s+remastered\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return t;
};

const buildPageUrl = (pageTitle) => `https://${PCGW_HOST}/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`;

// Resolve a page title via the Cargo Infobox_game table using a Steam AppID.
// Returns the canonical page title or null.
const pcgwResolveBySteamAppId = async (appid) => {
  if (!appid) return null;
  try {
    const data = await pcgwApiGet({
      action: 'cargoquery',
      tables: 'Infobox_game',
      fields: 'Infobox_game._pageName=PageName',
      where: `Infobox_game.Steam_AppID HOLDS "${String(appid).replace(/"/g, '')}"`,
      limit: '1',
    });
    const row = data?.cargoquery?.[0]?.title;
    const page = row?.PageName || row?.pageName || row?.['Page Name'];
    return page || null;
  } catch (err) {
    console.warn('[PCGW] cargo Steam_AppID lookup failed:', err.message);
    return null;
  }
};

// opensearch wrapper that returns { titles, urls }.
const pcgwOpenSearch = async (query) => {
  const search = await pcgwApiGet({
    action: 'opensearch',
    search: query,
    limit: '5',
    namespace: '0',
  });
  const titles = Array.isArray(search) && Array.isArray(search[1]) ? search[1] : [];
  const urls = Array.isArray(search) && Array.isArray(search[3]) ? search[3] : [];
  return { titles, urls };
};

const pcgwFetchWikitext = async (pageTitle) => {
  const parse = await pcgwApiGet({
    action: 'parse',
    page: pageTitle,
    prop: 'wikitext',
    redirects: '1',
  });
  return parse?.parse?.wikitext?.['*'] || '';
};

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('pcgw-lookup', async (_event, payload) => {
    // Accept either a string (legacy) or { name, appid }.
    const name = typeof payload === 'string' ? payload : payload?.name;
    const appid = typeof payload === 'object' && payload ? payload.appid : null;
    if (!name || typeof name !== 'string') {
      return { ok: false, error: 'invalid-query' };
    }

    try {
      // Tier 1: Steam AppID -> canonical page title via Cargo. Skips title noise.
      if (appid) {
        const direct = await pcgwResolveBySteamAppId(appid);
        if (direct) {
          const wikitext = await pcgwFetchWikitext(direct);
          if (wikitext) {
            return { ok: true, pageTitle: direct, pageUrl: buildPageUrl(direct), wikitext, matchedVia: 'steam-appid' };
          }
        }
      }

      // Tier 2: opensearch with normalized title.
      // Tier 3: fall back to raw title if normalized produced nothing useful.
      const normalized = normalizePcgwTitle(name);
      const candidates = [];
      if (normalized) candidates.push({ q: normalized, via: 'normalized' });
      if (!normalized || normalized.toLowerCase() !== name.trim().toLowerCase()) {
        candidates.push({ q: name.trim(), via: 'raw' });
      }

      let chosen = null;
      let chosenVia = '';
      let chosenUrl = '';
      for (const cand of candidates) {
        const { titles, urls } = await pcgwOpenSearch(cand.q);
        if (titles.length === 0) continue;
        const target = cand.q.toLowerCase();
        let bestIdx = 0;
        for (let i = 0; i < titles.length; i++) {
          if (titles[i].toLowerCase() === target) {
            bestIdx = i;
            break;
          }
        }
        chosen = titles[bestIdx];
        chosenUrl = urls[bestIdx] || buildPageUrl(chosen);
        chosenVia = cand.via;
        break;
      }

      if (!chosen) return { ok: false, error: 'no-page' };

      const wikitext = await pcgwFetchWikitext(chosen);
      if (!wikitext) {
        return { ok: false, error: 'no-wikitext', pageTitle: chosen, pageUrl: chosenUrl };
      }
      return { ok: true, pageTitle: chosen, pageUrl: chosenUrl, wikitext, matchedVia: chosenVia };
    } catch (error) {
      console.warn('[PCGW] lookup failed:', error.message);
      return { ok: false, error: error.message || 'unknown' };
    }
  });
}

module.exports = { registerIpcHandlers, normalizePcgwTitle, buildPageUrl };
