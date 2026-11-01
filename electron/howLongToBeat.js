const { httpsRequest } = require('./net');

// ---------------------------------------------------------------------------
// HowLongToBeat unofficial search bridge.
// HLTB has no official API. As of late 2026 their Next.js site uses a two-step
// flow:
//   1) GET /api/search/site/init?t=<timestamp>  → {token}
//   2) POST /api/search/site  (header x-auth-token)
//                             (body is the search payload)
// The token is bound to the client IP + User-Agent, so both requests must use
// the same UA and come from the user's machine — which they do via electron.net.
// On HTTP 403 the site itself re-inits and retries once; we mirror that.
// All requests are server-side (Electron main) to avoid CORS, and every step
// fails gracefully so the renderer can fall back to "unknown".
//
// We use electron.net (Chromium network stack) instead of Node https because
// HLTB's CDN blocks raw Node TLS fingerprints with 403.
// ---------------------------------------------------------------------------
let cachedHltbInit = { token: null, expires: 0 };

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

// Step 1: fetch the rotating auth token from HLTB.
const fetchHltbInit = async () => {
  const now = Date.now();
  if (cachedHltbInit.token && cachedHltbInit.expires > now) {
    return { token: cachedHltbInit.token };
  }

  const init = await httpsRequest(`https://howlongtobeat.com/api/search/site/init?t=${now}`, null, {
    'User-Agent': HLTB_UA,
    Accept: 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: 'https://howlongtobeat.com/',
    Origin: 'https://howlongtobeat.com',
  });
  if (init.status !== 200) {
    throw new Error(`HLTB init HTTP ${init.status}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(init.body);
  } catch {
    throw new Error('HLTB init parse failed');
  }
  if (!parsed || !parsed.token) {
    throw new Error('HLTB init missing token');
  }
  cachedHltbInit = { token: parsed.token, expires: now + 60 * 60 * 1000 };
  hltbDebug('[HLTB] init ok');
  return { token: parsed.token };
};

const invalidateHltbInit = () => {
  cachedHltbInit = { token: null, expires: 0 };
};

const postHltbSearch = async (cleanedQuery, token) => {
  // Strip trademark symbols and punctuation from each term so HLTB's
  // search engine isn't tripped up by trailing colons or ™ symbols.
  const rawTerms = cleanedQuery.trim().split(/\s+/);
  const cleanTerms = rawTerms.map((t) => t.replace(/[®™©:;,.!?&\-–—]/g, '')).filter(Boolean);
  const payload = JSON.stringify({
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
  });
  return httpsRequest('https://howlongtobeat.com/api/search/site', payload, {
    'User-Agent': HLTB_UA,
    'Content-Type': 'application/json',
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    Origin: 'https://howlongtobeat.com',
    Referer: 'https://howlongtobeat.com/',
    'x-auth-token': token,
  });
};

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('hltb-search', async (_event, query) => {
    const cleanedQuery = sanitizeHltbQuery(query);
    if (!cleanedQuery || typeof cleanedQuery !== 'string') {
      return { ok: false, error: 'invalid-query' };
    }
    hltbDebug(`[HLTB main] search request: "${cleanedQuery}"`);
    try {
      let { token } = await fetchHltbInit();
      let res = await postHltbSearch(cleanedQuery, token);
      if (res.status === 403) {
        // Token expired or rejected — the site refreshes and retries once.
        invalidateHltbInit();
        ({ token } = await fetchHltbInit());
        res = await postHltbSearch(cleanedQuery, token);
      }
      if (res.status !== 200) {
        invalidateHltbInit();
        console.warn(
          `[HLTB] POST /api/search/site -> ${res.status}; body: ${res.body?.slice(0, 200)?.replace(/\s+/g, ' ')}`
        );
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
