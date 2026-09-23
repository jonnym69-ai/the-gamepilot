const { BrowserWindow } = require('electron');
const { httpsRequest } = require('./net');

const steamHttpsGet = async (hostname, pathname) => {
  const res = await httpsRequest(`https://${hostname}${pathname}`, null, {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GamePilot/1.4',
    Accept: 'application/json',
  });
  if (res.status !== 200) throw new Error(`steam-http-${res.status}`);
  return JSON.parse(res.body);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseWishlistFromHtml = (html) => {
  // Steam's wishlist HTML embeds the data in g_rgWishlistData (object or array)
  const match = html.match(/g_rgWishlistData\s*=\s*(\{.*?\}|\[.*?\]);/s);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[1]);
    if (Array.isArray(raw)) {
      return raw
        .map((item) => ({
          appid: String(item?.appid || item?.id || ''),
          name: item?.name || '',
        }))
        .filter((item) => item.name && item.appid);
    }
    if (!raw || typeof raw !== 'object') return null;
    return Object.entries(raw)
      .map(([appid, item]) => ({
        appid: String(appid),
        name: item?.name || '',
      }))
      .filter((item) => item.name);
  } catch {
    return null;
  }
};

const fetchSteamWishlistViaWindow = async (steamId) => {
  const cleanId = String(steamId || '').replace(/[^0-9]/g, '');
  if (!cleanId) return [];
  const url = `https://store.steampowered.com/wishlist/profiles/${cleanId}/`;

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
      },
    });

    const timeout = setTimeout(() => {
      try {
        win.destroy();
      } catch {}
      reject(new Error('Steam wishlist page took too long to load.'));
    }, 30_000);

    const finish = (items) => {
      clearTimeout(timeout);
      try {
        win.destroy();
      } catch {}
      resolve(items);
    };

    const fail = (err) => {
      clearTimeout(timeout);
      try {
        win.destroy();
      } catch {}
      reject(err);
    };

    const extractWishlist = () =>
      win.webContents.executeJavaScript(`
      (function() {
        if (typeof g_rgWishlistData !== 'undefined' && g_rgWishlistData) {
          return g_rgWishlistData;
        }
        const scripts = Array.from(document.querySelectorAll('script'));
        for (const s of scripts) {
          const m = s.textContent.match(/g_rgWishlistData\\s*=\\s*({.*?}|\\[.*?\\]);/s);
          if (m) {
            try { return JSON.parse(m[1]); } catch (e) {}
          }
        }
        return null;
      })()
    `);

    win.webContents.on('did-finish-load', async () => {
      try {
        const pageUrl = win.webContents.getURL();
        const pageTitle = await win.webContents.executeJavaScript('document.title');
        console.log('[SteamWishlist] BrowserWindow loaded:', pageUrl, '-', pageTitle);

        // Steam loads wishlist data dynamically; give it a few seconds
        for (let attempt = 0; attempt < 6; attempt++) {
          await sleep(1000);
          const data = await extractWishlist();
          if (data && typeof data === 'object') {
            console.log('[SteamWishlist] Found wishlist data after', attempt + 1, 'attempt(s)');
            if (Array.isArray(data)) {
              return finish(
                data
                  .map((item) => ({
                    appid: String(item?.appid || item?.id || ''),
                    name: item?.name || '',
                  }))
                  .filter((item) => item.name && item.appid)
              );
            }
            return finish(
              Object.entries(data)
                .map(([appid, item]) => ({
                  appid: String(appid),
                  name: item?.name || '',
                }))
                .filter((item) => item.name)
            );
          }
        }

        // Try parsing the full HTML source as a last resort
        const fullHtml = await win.webContents.executeJavaScript(`
          document.documentElement ? document.documentElement.outerHTML : ''
        `);
        const fromHtml = parseWishlistFromHtml(fullHtml);
        if (fromHtml && fromHtml.length > 0) {
          console.log('[SteamWishlist] Parsed wishlist from full HTML source');
          return finish(fromHtml);
        }

        const bodyText = await win.webContents.executeJavaScript(`
          document.body ? document.body.innerText.slice(0, 2000) : ''
        `);
        console.warn('[SteamWishlist] No g_rgWishlistData found. Page title:', pageTitle);
        console.warn('[SteamWishlist] Page body text:', bodyText.replace(/\s+/g, ' '));
        fail(
          new Error(
            'Steam wishlist page loaded but no wishlist data was found. Make sure your wishlist is public and not empty.'
          )
        );
      } catch (err) {
        fail(err);
      }
    });

    win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      fail(new Error(`Failed to load Steam wishlist page: ${errorDescription} (${errorCode})`));
    });

    win.loadURL(url, {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    });
  });
};

const fetchSteamWishlistDirect = async (steamId) => {
  const cleanId = String(steamId || '').replace(/[^0-9]/g, '');
  if (!cleanId) return [];
  const baseUrl = `https://store.steampowered.com/wishlist/profiles/${cleanId}/wishlistdata/`;
  const res = await httpsRequest(`${baseUrl}?p=0`, null, {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 GamePilot/1.4',
    Accept: 'application/json, text/html',
    Referer: `https://store.steampowered.com/wishlist/profiles/${cleanId}/`,
  });
  if (res.status !== 200) throw new Error(`steam-wishlist-http-${res.status}`);
  const body = res.body || '';
  if (body.trim().startsWith('<')) {
    const fromHtml = parseWishlistFromHtml(body);
    if (fromHtml) return fromHtml;
    const isPrivate = /private|sign in|login|agecheck|denied|not available/i.test(body);
    throw new Error(
      isPrivate
        ? 'Steam returned a web page instead of the wishlist. Make sure your Steam profile and wishlist are public.'
        : 'Steam returned an unexpected HTML page. The wishlist may be private or temporarily unavailable.'
    );
  }
  const raw = JSON.parse(body);
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw)
    .map(([appid, item]) => ({
      appid: String(appid),
      name: item?.name || '',
    }))
    .filter((item) => item.name);
};

const fetchSteamWishlist = async (steamId) => {
  try {
    const items = await fetchSteamWishlistViaWindow(steamId);
    console.log('[SteamWishlist] BrowserWindow fetch returned', items.length, 'item(s)');
    return items;
  } catch (windowErr) {
    console.warn('[SteamWishlist] BrowserWindow fetch failed:', windowErr.message);
    console.log('[SteamWishlist] Falling back to direct fetch');
    return fetchSteamWishlistDirect(steamId);
  }
};

const enrichWishlistItems = async (items) => {
  const enriched = [];
  const batchSize = 5;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const appids = batch.map((item) => item.appid).join(',');
    try {
      const details = await steamHttpsGet('store.steampowered.com', `/api/appdetails?appids=${appids}`);
      for (const item of batch) {
        const info = details?.[item.appid]?.data;
        enriched.push({
          appid: item.appid,
          name: item.name,
          genres: Array.isArray(info?.genres) ? info.genres.map((g) => g.description) : [],
          image: info?.header_image || null,
          isFree: info?.is_free || false,
        });
      }
    } catch (err) {
      console.warn('[SteamWishlist] Failed to enrich wishlist batch:', err.message);
      for (const item of batch) {
        enriched.push({ appid: item.appid, name: item.name, genres: [], image: null, isFree: false });
      }
    }
    if (i + batchSize < items.length) await sleep(500);
  }
  return enriched;
};

// ---------------------------------------------------------------------------
// Steam "More Like This" discovery.
// Scrapes store.steampowered.com/recommended/morelike/app/{appid}/ via a
// hidden BrowserWindow (same pattern as the wishlist scraper) and extracts
// the recommended app IDs + names + prices.  Results are enriched with
// genres via appdetails so the renderer can score them against the user's
// taste profile.  Cached in-memory for 24h per appid.
// ---------------------------------------------------------------------------
const MORELIKE_CACHE = new Map();
const MORELIKE_CACHE_TTL = 24 * 60 * 60 * 1000;

const fetchMoreLikeViaWindow = async (appid) => {
  const id = String(appid || '').replace(/[^0-9]/g, '');
  if (!id) return [];
  const url = `https://store.steampowered.com/recommended/morelike/app/${id}/`;

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
      },
    });

    const timeout = setTimeout(() => {
      try {
        win.destroy();
      } catch {}
      reject(new Error('Steam "more like this" page took too long to load.'));
    }, 30_000);

    const finish = (items) => {
      clearTimeout(timeout);
      try {
        win.destroy();
      } catch {}
      resolve(items);
    };

    const fail = (err) => {
      clearTimeout(timeout);
      try {
        win.destroy();
      } catch {}
      reject(err);
    };

    win.webContents.on('did-finish-load', async () => {
      try {
        // Steam loads the recommendation list dynamically; poll a few times.
        for (let attempt = 0; attempt < 6; attempt++) {
          await sleep(1000);
          const items = await win.webContents.executeJavaScript(`
            (function() {
              var rows = document.querySelectorAll('.search_result_row, .recommendation_carousel_item, a.ds_flagged');
              if (!rows.length) return null;
              var results = [];
              rows.forEach(function(row) {
                var href = row.getAttribute('href') || '';
                var m = href.match(/\\/app\\/(\\d+)/);
                if (!m) return;
                var nameEl = row.querySelector('.title, .recommendation_name, .search_name');
                var priceEl = row.querySelector('.search_price, .price, .discount_final_price');
                results.push({
                  appid: m[1],
                  name: nameEl ? nameEl.textContent.trim() : '',
                  price: priceEl ? priceEl.textContent.trim() : null
                });
              });
              return results.length ? results : null;
            })()
          `);
          if (items && Array.isArray(items) && items.length > 0) {
            return finish(items);
          }
        }

        // Last resort: try the store search API for the same genres.
        // This is a fallback when the morelike page doesn't render properly.
        finish([]);
      } catch (err) {
        fail(err);
      }
    });

    win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      fail(new Error(`Failed to load Steam morelike page: ${errorDescription} (${errorCode})`));
    });

    win.loadURL(url, {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    });
  });
};

const enrichMoreLikeItems = async (items) => {
  const enriched = [];
  const batchSize = 5;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const appids = batch.map((item) => item.appid).join(',');
    try {
      const details = await steamHttpsGet('store.steampowered.com', `/api/appdetails?appids=${appids}`);
      for (const item of batch) {
        const info = details?.[item.appid]?.data;
        enriched.push({
          appid: item.appid,
          name: item.name || info?.name || '',
          genres: Array.isArray(info?.genres) ? info.genres.map((g) => g.description) : [],
          image: info?.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.appid}/header.jpg`,
          isFree: info?.is_free || false,
          price: item.price || null,
        });
      }
    } catch (err) {
      console.warn('[SteamMoreLike] Failed to enrich batch:', err.message);
      for (const item of batch) {
        enriched.push({
          appid: item.appid,
          name: item.name || '',
          genres: [],
          image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${item.appid}/header.jpg`,
          isFree: false,
          price: item.price || null,
        });
      }
    }
    if (i + batchSize < items.length) await sleep(500);
  }
  return enriched;
};

const spotlightCache = new Map();
const spotlightInflight = new Map();
const spotlightText = (value) => (typeof value === 'string' ? value.trim().slice(0, 160) : '');
const spotlightList = (value) => (Array.isArray(value) ? value.map(spotlightText).filter(Boolean).slice(0, 5) : []);

const fetchSpotlight = async (id) => {
  const [storeResult, playerResult] = await Promise.allSettled([
    steamHttpsGet('store.steampowered.com', `/api/appdetails?appids=${id}&l=english`),
    steamHttpsGet('api.steampowered.com', `/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${id}`),
  ]);
  const fetchedAt = Date.now();
  const app = storeResult.status === 'fulfilled' ? storeResult.value?.[id] : null;
  const data =
    app?.success === true && app.data?.type === 'game' && String(app.data.steam_appid) === id ? app.data : null;
  const score = data?.metacritic?.score;
  const store = data
    ? {
        releaseDate: spotlightText(data.release_date?.date),
        comingSoon: data.release_date?.coming_soon === true,
        developers: spotlightList(data.developers),
        publishers: spotlightList(data.publishers),
        genres: spotlightList(Array.isArray(data.genres) ? data.genres.map((genre) => genre?.description) : []),
        metacritic: Number.isInteger(score) && score > 0 && score <= 100 ? score : null,
        fetchedAt,
      }
    : null;
  const response = playerResult.status === 'fulfilled' ? playerResult.value?.response : null;
  const count = response?.player_count;
  const players = response?.result === 1 && Number.isSafeInteger(count) && count >= 0 ? { count, fetchedAt } : null;
  return { ok: Boolean(store || players), store, players };
};

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('steam-spotlight', async (_event, appid) => {
    const id = typeof appid === 'string' || typeof appid === 'number' ? String(appid) : '';
    if (!/^[1-9]\d{0,9}$/.test(id) || Number(id) > 4294967295) return { ok: false, error: 'invalid-appid' };
    const cached = spotlightCache.get(id);
    if (cached && Date.now() < cached.expiresAt) return cached.result;
    if (spotlightInflight.has(id)) return spotlightInflight.get(id);
    const request = fetchSpotlight(id)
      .then((result) => {
        spotlightCache.delete(id);
        spotlightCache.set(id, {
          result,
          expiresAt: Date.now() + (result.store && result.players ? 86400000 : 3600000),
        });
        if (spotlightCache.size > 64) spotlightCache.delete(spotlightCache.keys().next().value);
        return result;
      })
      .finally(() => spotlightInflight.delete(id));
    spotlightInflight.set(id, request);
    return request;
  });

  ipcMain.handle('steam-appreviews', async (_event, appid) => {
    const id = String(appid || '').replace(/[^0-9]/g, '');
    if (!id) return { ok: false, error: 'invalid-appid' };
    try {
      // num_per_page=0 keeps the response tiny — we only want query_summary.
      const data = await steamHttpsGet(
        'store.steampowered.com',
        `/appreviews/${id}?json=1&num_per_page=0&purchase_type=all&language=all`
      );
      if (!data || data.success !== 1 || !data.query_summary) {
        return { ok: false, error: 'no-summary' };
      }
      return { ok: true, summary: data.query_summary };
    } catch (error) {
      console.warn('[SteamSnapshot] appreviews failed:', error.message);
      return { ok: false, error: error.message || 'unknown' };
    }
  });

  ipcMain.handle('steam-global-achievements', async (_event, appid) => {
    const id = String(appid || '').replace(/[^0-9]/g, '');
    if (!id) return { ok: false, error: 'invalid-appid' };
    try {
      const data = await steamHttpsGet(
        'api.steampowered.com',
        `/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${id}&format=json`
      );
      const list = data?.achievementpercentages?.achievements;
      if (!Array.isArray(list)) return { ok: false, error: 'no-data' };
      // Normalise to a smaller shape; Steam returns {name, percent} already but
      // percent is a float string in older payloads.
      const achievements = list
        .map((a) => ({ name: String(a.name || ''), percent: Number(a.percent) || 0 }))
        .filter((a) => a.name);
      return { ok: true, achievements };
    } catch (error) {
      console.warn('[SteamSnapshot] global-achievements failed:', error.message);
      return { ok: false, error: error.message || 'unknown' };
    }
  });

  ipcMain.handle('steam-personal-achievements-preflight', async (_event, payload = {}) => {
    const apiKey = String(payload?.apiKey || '')
      .trim()
      .replace(/[^A-Fa-f0-9]/g, '');
    const steamId = String(payload?.steamId || '')
      .trim()
      .replace(/[^0-9]/g, '');
    const games = Array.isArray(payload?.games) ? payload.games : [];
    if (!apiKey || apiKey.length < 20) return { ok: false, error: 'missing-api-key' };
    if (!steamId || steamId.length < 16) return { ok: false, error: 'missing-steamid' };

    const sampleGames = games
      .map((game) => ({
        appid: String(game?.appid || '').replace(/[^0-9]/g, ''),
        name: String(game?.name || game?.title || '').trim(),
      }))
      .filter((game) => game.appid)
      .slice(0, 5);

    try {
      const playerData = await steamHttpsGet(
        'api.steampowered.com',
        `/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}&format=json`
      );
      const player = playerData?.response?.players?.[0];
      if (!player) return { ok: false, error: 'steam-profile-not-found' };

      const sampleResults = [];
      for (const game of sampleGames) {
        try {
          const data = await steamHttpsGet(
            'api.steampowered.com',
            `/ISteamUserStats/GetPlayerAchievements/v0001/?key=${apiKey}&steamid=${steamId}&appid=${game.appid}&l=en&format=json`
          );
          const achievements = data?.playerstats?.achievements;
          const list = Array.isArray(achievements) ? achievements : [];
          const unlocked = list.filter((achievement) => Number(achievement?.achieved || 0) > 0).length;
          sampleResults.push({
            appid: game.appid,
            name: game.name || `Steam App ${game.appid}`,
            ok: true,
            total: list.length,
            unlocked,
            locked: Math.max(0, list.length - unlocked),
            sampleOnly: true,
          });
        } catch (error) {
          sampleResults.push({
            appid: game.appid,
            name: game.name || `Steam App ${game.appid}`,
            ok: false,
            error: error.message || 'achievement-preflight-failed',
            sampleOnly: true,
          });
        }
      }

      return {
        ok: true,
        personaName: player.personaname || 'Steam profile',
        profileState: Number(player.profilestate || 0),
        communityVisibilityState: Number(player.communityvisibilitystate || 0),
        sampleCount: sampleResults.length,
        results: sampleResults,
        message: 'Preflight only. GamePilot did not import or merge Steam unlock data.',
      };
    } catch (error) {
      console.warn('[SteamPersonalAchievements] preflight failed:', error.message);
      return { ok: false, error: error.message || 'steam-personal-preflight-failed' };
    }
  });

  // ---------------------------------------------------------------------------
  // Steam News bridge (anonymous). Pulls recent announcements / patch notes
  // for a Steam appid via api.steampowered.com/ISteamNews/GetNewsForApp/v0002/.
  // Used by SteamNewsService on the renderer to render "Updated since you last
  // played" badges and the patch-notes list inside GameModal.
  // ---------------------------------------------------------------------------
  ipcMain.handle('steam-news', async (_event, payload) => {
    const appid = String(payload?.appid || '').replace(/[^0-9]/g, '');
    if (!appid) return { ok: false, error: 'invalid-appid' };
    const count = Math.max(1, Math.min(20, Number(payload?.count) || 5));
    const maxLen = 600; // keep the renderer cache light; we only show previews
    try {
      const data = await steamHttpsGet(
        'api.steampowered.com',
        `/ISteamNews/GetNewsForApp/v0002/?appid=${appid}&count=${count}&maxlength=${maxLen}&format=json`
      );
      const items = data?.appnews?.newsitems;
      if (!Array.isArray(items)) return { ok: false, error: 'no-data' };
      return { ok: true, items };
    } catch (error) {
      console.warn('[SteamNews] news failed:', error.message);
      return { ok: false, error: error.message || 'unknown' };
    }
  });

  // ---------------------------------------------------------------------------
  // Steam Wishlist Import (anonymous, no API key).
  // Fetches the public wishlist from store.steampowered.com and enriches each
  // item with genres/header_image via appdetails. All data is returned to the
  // renderer and stored locally; GamePilot does not send the wishlist to any
  // third-party server.
  //
  // Steam sometimes serves the direct JSON endpoint a bot-challenge / login page,
  // so we use a hidden BrowserWindow (real Chromium) as the primary fetch path.
  // That shares the same session/cookies as the main app and is far less likely
  // to be blocked.
  // ---------------------------------------------------------------------------
  ipcMain.handle('steam-wishlist', async (_event, steamId) => {
    try {
      const cleanId = String(steamId || '').replace(/[^0-9]/g, '');
      if (!cleanId) {
        return { success: false, error: 'A valid Steam64 ID is required.', items: [] };
      }
      console.log('[SteamWishlist] Fetching wishlist for', cleanId);
      const items = await fetchSteamWishlist(cleanId);
      if (items.length === 0) {
        return { success: true, count: 0, items: [], error: null };
      }
      const enriched = await enrichWishlistItems(items);
      console.log(`[SteamWishlist] Enriched ${enriched.length} item(s)`);
      return { success: true, count: enriched.length, items: enriched, error: null };
    } catch (err) {
      console.error('[SteamWishlist] Error:', err.message);
      return { success: false, error: err.message || 'Could not fetch Steam wishlist.', items: [] };
    }
  });

  // ---------------------------------------------------------------------------
  // Steam "More Like This" — discovers games similar to a given appid from
  // the Steam store catalog.  Used by SimilarGamesService to recommend games
  // the user doesn't own yet.  Results are cached in-memory for 24h.
  // ---------------------------------------------------------------------------
  ipcMain.handle('steam-morelike', async (_event, appid) => {
    const id = String(appid || '').replace(/[^0-9]/g, '');
    if (!id) return { ok: false, error: 'invalid-appid', items: [] };

    const cached = MORELIKE_CACHE.get(id);
    if (cached && Date.now() - cached.at < MORELIKE_CACHE_TTL) {
      return { ok: true, items: cached.items, cached: true };
    }

    try {
      const raw = await fetchMoreLikeViaWindow(id);
      if (raw.length === 0) {
        return { ok: true, items: [], cached: false };
      }
      const enriched = await enrichMoreLikeItems(raw.slice(0, 12));
      MORELIKE_CACHE.set(id, { at: Date.now(), items: enriched });
      return { ok: true, items: enriched, cached: false };
    } catch (err) {
      console.warn('[SteamMoreLike] Error:', err.message);
      return { ok: false, error: err.message || 'Could not fetch similar games.', items: [] };
    }
  });
}

module.exports = { registerIpcHandlers };
