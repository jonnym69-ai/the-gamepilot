const { httpsRequest } = require('./net');

// ---------------------------------------------------------------------------
// HowLongToBeat unofficial search bridge.
// HLTB has no official API. As of 2025 their search moved to a two-step flow:
//   1) GET /api/bleed/init?t=<timestamp>  → {token, hpKey, hpVal}
//   2) POST /api/bleed  (headers x-auth-token, x-hp-key, x-hp-val)
//                       (body includes the search payload + [hpKey]: hpVal)
// All requests are server-side (Electron main) to avoid CORS, and every step
// fails gracefully so the renderer can fall back to "unknown".
//
// We use electron.net (Chromium network stack) instead of Node https because
// HLTB's CDN blocks raw Node TLS fingerprints with 403.
// ---------------------------------------------------------------------------
let cachedHltbBleed = { token: null, hpKey: null, hpVal: null, expires: 0 };

const HLTB_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36';
const HLTB_DEBUG = process.env.GAMEPILOT_HLTB_DEBUG === 'true';

const hltbDebug = (...args) => {
  if (HLTB_DEBUG) {
    console.log(...args);
  }
};

const sanitizeHltbQuery = (value) =>
  String(value || '')
    .replace(/Ôäó/g, '™')
    .replace(/┬«/g, '®')
    .replace(/┬®/g, '©')
    .replace(/ÔÇÖ/g, '’')
    .replace(/ÔÇ£|ÔÇØ/g, '"')
    .replace(/ÔÇô|ÔÇö/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

// Step 1: fetch the rotating auth token + hpKey/hpVal pair from HLTB.
const fetchHltbBleedInit = async () => {
  const now = Date.now();
  if (cachedHltbBleed.token && cachedHltbBleed.hpKey && cachedHltbBleed.hpVal && cachedHltbBleed.expires > now) {
    return { token: cachedHltbBleed.token, hpKey: cachedHltbBleed.hpKey, hpVal: cachedHltbBleed.hpVal };
  }

  const init = await httpsRequest(`https://howlongtobeat.com/api/bleed/init?t=${now}`, null, {
    'User-Agent': HLTB_UA,
    Accept: 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: 'https://howlongtobeat.com/',
    Origin: 'https://howlongtobeat.com',
  });
  if (init.status !== 200) {
    throw new Error(`HLTB bleed/init HTTP ${init.status}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(init.body);
  } catch {
    throw new Error('HLTB bleed/init parse failed');
  }
  if (!parsed || !parsed.token || !parsed.hpKey || !parsed.hpVal) {
    throw new Error('HLTB bleed/init missing fields');
  }
  cachedHltbBleed = { token: parsed.token, hpKey: parsed.hpKey, hpVal: parsed.hpVal, expires: now + 60 * 60 * 1000 };
  hltbDebug(`[HLTB] bleed/init ok — hpKey=${parsed.hpKey}`);
  return { token: parsed.token, hpKey: parsed.hpKey, hpVal: parsed.hpVal };
};

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('hltb-search', async (_event, query) => {
    const cleanedQuery = sanitizeHltbQuery(query);
    if (!cleanedQuery || typeof cleanedQuery !== 'string') {
      return { ok: false, error: 'invalid-query' };
    }
    hltbDebug(`[HLTB main] search request: "${cleanedQuery}"`);
    try {
      const { token, hpKey, hpVal } = await fetchHltbBleedInit();
      // Strip trademark symbols and punctuation from each term so HLTB's
      // search engine isn't tripped up by trailing colons or ™ symbols.
      const rawTerms = cleanedQuery.trim().split(/\s+/);
      const cleanTerms = rawTerms.map((t) => t.replace(/[\u00ae\u2122\u00a9:;,.!?&\-–—]/g, '')).filter(Boolean);
      const payloadBody = {
        searchType: 'games',
        searchTerms: cleanTerms.length ? cleanTerms : rawTerms,
        searchPage: 1,
        size: 20,
        searchOptions: {
          games: {
            userId: 0,
            platform: '',
            sortCategory: 'popular',
            rangeCategory: 'main',
            rangeTime: { min: null, max: null },
            gameplay: { perspective: '', flow: '', genre: '', difficulty: '' },
            rangeYear: { min: '', max: '' },
            modifier: '',
          },
          users: { sortCategory: 'postcount' },
          lists: { sortCategory: 'follows' },
          filter: '',
          sort: 0,
          randomizer: 0,
        },
        useCache: true,
        [hpKey]: hpVal,
      };
      const payload = JSON.stringify(payloadBody);
      const res = await httpsRequest('https://howlongtobeat.com/api/bleed', payload, {
        'User-Agent': HLTB_UA,
        'Content-Type': 'application/json',
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        Origin: 'https://howlongtobeat.com',
        Referer: 'https://howlongtobeat.com/',
        'x-auth-token': token,
        'x-hp-key': hpKey,
        'x-hp-val': hpVal,
      });

      if (res.status !== 200) {
        // Invalidate cached bleed init so next call re-fetches.
        cachedHltbBleed = { token: null, hpKey: null, hpVal: null, expires: 0 };
        console.warn(`[HLTB] POST /api/bleed -> ${res.status}; body: ${res.body?.slice(0, 200)?.replace(/\s+/g, ' ')}`);
        return { ok: false, error: `http-${res.status}` };
      }
      let parsed;
      try {
        parsed = JSON.parse(res.body);
      } catch {
        return { ok: false, error: 'parse' };
      }
      const data = parsed && Array.isArray(parsed.data) ? parsed.data : [];
      const results = data.map((g) => ({
        id: g.game_id,
        name: g.game_name,
        alias: g.game_alias || '',
        imageUrl: g.game_image ? `https://howlongtobeat.com/games/${g.game_image}` : null,
        // HLTB delivers seconds.
        mainSeconds: g.comp_main || 0,
        mainExtraSeconds: g.comp_plus || 0,
        completionistSeconds: g.comp_100 || 0,
        allStylesSeconds: g.comp_all || 0,
        releaseYear: g.release_world || null,
        reviewScore: g.review_score || null,
      }));
      hltbDebug(`[HLTB] found ${results.length} result(s) for "${cleanedQuery}"`);
      return { ok: true, results };
    } catch (error) {
      console.warn('[HLTB] search failed:', error.message);
      return { ok: false, error: error.message || 'unknown' };
    }
  });
}

module.exports = { registerIpcHandlers };
