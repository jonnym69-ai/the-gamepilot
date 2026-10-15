const { BrowserWindow } = require('electron');
const { httpsRequest } = require('./net');

const STEAM_FRIENDS_RELAY_URL = 'https://gamepilot-moz.netlify.app/api/getSteamFriends';
const STEAM_PROFILE_RELAY_URL = 'https://gamepilot-moz.netlify.app/api/getSteamProfile';
const STEAM_LIBRARY_RELAY_URL = 'https://gamepilot-moz.netlify.app/api/getSteamLibrary';
const FRIENDS_CACHE = new Map();
const FRIENDS_CACHE_TTL_MS = 60000;
const PROFILE_CACHE = new Map();
const PROFILE_CACHE_TTL_MS = 5 * 60000;
const OWNED_CACHE = new Map();
const OWNED_CACHE_TTL_MS = 6 * 60 * 60000;

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
  const res = await httpsRequest(
    `https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid=${steamId}`,
    null,
    { Accept: 'application/json' }
  );
  const header = res.headers?.['x-eresult'];
  const result = Number(Array.isArray(header) ? header[0] : header);
  if (res.status === 401 || res.status === 403 || result === 15) {
    throw new Error('Steam denied access to this wishlist. Check that it is public in Steam privacy settings.');
  }
  if (res.status === 429 || result === 84) {
    throw new Error('Steam is rate limiting wishlist requests. Please try again later.');
  }
  if (res.status !== 200) throw new Error(`Steam wishlist service is unavailable (HTTP ${res.status}).`);
  if (header !== undefined && result !== 1) {
    throw new Error('Steam could not return this wishlist. Please try again later.');
  }
  let response;
  try {
    response = JSON.parse(res.body)?.response;
  } catch {
    throw new Error('Steam returned an unexpected wishlist response. Please try again later.');
  }
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new Error('Steam returned an invalid wishlist response. Please try again later.');
  }
  if (response.items === undefined && result === 1) return [];
  if (!Array.isArray(response.items) || response.items.some((item) => !validAppId(item?.appid))) {
    throw new Error('Steam returned invalid wishlist items. Please try again later.');
  }
  return [...new Set(response.items.map((item) => String(item.appid)))].map((appid) => ({ appid }));
};

const fetchSteamWishlist = async (steamId) => {
  try {
    return await fetchSteamWishlistDirect(steamId);
  } catch (error) {
    if (!error.message.includes('(HTTP 404)')) throw error;
    console.warn('[SteamWishlist] Wishlist API unavailable; trying the legacy page.');
    return fetchSteamWishlistViaWindow(steamId);
  }
};

const wishlistDetailsCache = new Map();
const enrichWishlistItems = async (items) => {
  const enriched = [];
  const batchSize = 3;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    let throttled = false;
    let requested = false;
    const results = await Promise.all(
      batch.map(async (item) => {
        const cached = wishlistDetailsCache.get(item.appid);
        if (cached && Date.now() < cached.expiresAt) return cached.data;
        try {
          requested = true;
          const details = await steamHttpsGet(
            'store.steampowered.com',
            `/api/appdetails?appids=${item.appid}&cc=us&l=english`
          );
          const info = Object.values(details || {}).find(
            (entry) => entry?.success === true && String(entry.data?.steam_appid) === item.appid
          )?.data;
          const name = typeof info?.name === 'string' ? info.name.trim() : item.name;
          if (!name) return null;
          const data = {
            appid: item.appid,
            name,
            genres: Array.isArray(info?.genres) ? info.genres.map((g) => g.description).filter(Boolean) : [],
            image: steamImageUrl(info?.header_image) || null,
            isFree: info?.is_free === true,
          };
          if (wishlistDetailsCache.size >= 2000) wishlistDetailsCache.delete(wishlistDetailsCache.keys().next().value);
          wishlistDetailsCache.set(item.appid, { data, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
          return data;
        } catch (err) {
          if (/steam-http-(429|403)/.test(err.message)) throttled = true;
          console.warn('[SteamWishlist] Failed to fetch game details:', err.message);
          return null;
        }
      })
    );
    enriched.push(...results.filter(Boolean));
    if (throttled) break;
    if (requested && i + batchSize < items.length) await sleep(1500);
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

const storeDetailsCache = new Map();
const storeDetailsInflight = new Map();
const validAppId = (appid) => {
  const id = typeof appid === 'string' || typeof appid === 'number' ? String(appid) : '';
  return /^[1-9]\d{0,9}$/.test(id) && Number(id) <= 4294967295 ? id : null;
};
const steamImageUrl = (value) => {
  if (typeof value !== 'string' || value.length > 2048) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (url.hostname === 'steamstatic.com' ||
        url.hostname.endsWith('.steamstatic.com') ||
        url.hostname === 'steamcdn-a.akamaihd.net')
      ? value
      : '';
  } catch {
    return '';
  }
};
const fetchStoreDetails = async (id) => {
  const cached = storeDetailsCache.get(id);
  if (cached && Date.now() < cached.expiresAt) return cached.data;
  if (storeDetailsInflight.has(id)) return storeDetailsInflight.get(id);
  const request = steamHttpsGet('store.steampowered.com', `/api/appdetails?appids=${id}&cc=us&l=english`)
    .then((response) => {
      const app =
        response && typeof response === 'object' && !Array.isArray(response)
          ? Object.values(response).find(
              (entry) => entry?.success === true && entry.data?.type === 'game' && String(entry.data.steam_appid) === id
            )
          : null;
      if (!app) return null;
      const source = app.data;
      const data = {
        type: 'game',
        steam_appid: Number(id),
        fetchedAt: Date.now(),
        name: spotlightText(source.name),
        short_description: spotlightDescription(source.short_description),
        release_date: {
          date: spotlightText(source.release_date?.date),
          coming_soon: source.release_date?.coming_soon === true,
        },
        developers: spotlightList(source.developers),
        publishers: spotlightList(source.publishers),
        genres: spotlightList(Array.isArray(source.genres) ? source.genres.map((genre) => genre?.description) : []).map(
          (description) => ({ description })
        ),
        categories: (Array.isArray(source.categories) ? source.categories : [])
          .map((category) => spotlightText(category?.description))
          .filter(Boolean)
          .slice(0, 40)
          .map((description) => ({ description })),
        // Canonical artwork URLs — validated through steamImageUrl. Wishlist
        // healing uses header_image since guessed /apps/<id>/header.jpg paths
        // 404 on newer app IDs (hashed store_item_assets hosting).
        header_image: steamImageUrl(source.header_image) || null,
        capsule_image: steamImageUrl(source.capsule_image) || null,
        metacritic: { score: source.metacritic?.score },
        price_overview: source.price_overview || null,
        screenshots: (Array.isArray(source.screenshots) ? source.screenshots : [])
          .map((image) => ({
            path_full: steamImageUrl(image?.path_full),
            path_thumbnail: steamImageUrl(image?.path_thumbnail),
          }))
          .filter((image) => image.path_full && image.path_thumbnail)
          .slice(0, 8),
      };
      storeDetailsCache.delete(id);
      storeDetailsCache.set(id, { data, expiresAt: Date.now() + 86400000 });
      if (storeDetailsCache.size > 64) storeDetailsCache.delete(storeDetailsCache.keys().next().value);
      return data;
    })
    .finally(() => storeDetailsInflight.delete(id));
  storeDetailsInflight.set(id, request);
  return request;
};

const playerCountCache = new Map();
const playerCountInflight = new Map();
const PLAYER_COUNT_TTL_MS = 300000;

const fetchPlayerCount = async (id) => {
  const cached = playerCountCache.get(id);
  if (cached && Date.now() < cached.expiresAt) return cached.data;
  if (playerCountInflight.has(id)) return playerCountInflight.get(id);
  const request = steamHttpsGet('api.steampowered.com', `/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${id}`)
    .then((value) => {
      const response = value?.response;
      const count = response?.player_count;
      const data =
        response?.result === 1 && Number.isSafeInteger(count) && count >= 0 ? { count, fetchedAt: Date.now() } : null;
      playerCountCache.delete(id);
      playerCountCache.set(id, { data, expiresAt: Date.now() + PLAYER_COUNT_TTL_MS });
      if (playerCountCache.size > 128) playerCountCache.delete(playerCountCache.keys().next().value);
      return data;
    })
    .finally(() => playerCountInflight.delete(id));
  playerCountInflight.set(id, request);
  return request;
};

const mostPlayedCache = { data: null, expiresAt: 0 };
const MOST_PLAYED_TTL_MS = 600000;

// Steam's global "most played" chart — the same data behind Steam's own
// top-played list. One keyless request returns the top 100 by live concurrent
// players; we intersect it with the user's library in the renderer.
const fetchMostPlayed = async () => {
  if (mostPlayedCache.data && Date.now() < mostPlayedCache.expiresAt) {
    return mostPlayedCache.data;
  }
  const data = await steamHttpsGet(
    'api.steampowered.com',
    '/ISteamChartsService/GetGamesByConcurrentPlayers/v1/?format=json'
  );
  const ranks = Array.isArray(data?.response?.ranks) ? data.response.ranks : [];
  const rows = ranks
    .filter(
      (entry) =>
        Number.isSafeInteger(entry?.appid) &&
        Number.isSafeInteger(entry?.concurrent_in_game) &&
        entry.concurrent_in_game >= 0
    )
    .map((entry) => ({
      appid: entry.appid,
      rank: Number.isSafeInteger(entry.rank) ? entry.rank : null,
      concurrent: entry.concurrent_in_game,
      peak: Number.isSafeInteger(entry.peak_in_game) ? entry.peak_in_game : null,
    }));
  const result = {
    ok: rows.length > 0,
    rows,
    fetchedAt: Number.isSafeInteger(data?.response?.last_update) ? data.response.last_update * 1000 : Date.now(),
  };
  mostPlayedCache.data = result;
  mostPlayedCache.expiresAt = Date.now() + MOST_PLAYED_TTL_MS;
  return result;
};

const spotlightCache = new Map();
const spotlightInflight = new Map();
const spotlightText = (value) => (typeof value === 'string' ? value.trim().slice(0, 160) : '');
const spotlightDescription = (value) => (typeof value === 'string' ? value.trim().slice(0, 320) : '');
const spotlightList = (value) => (Array.isArray(value) ? value.map(spotlightText).filter(Boolean).slice(0, 5) : []);

const fetchSpotlight = async (id) => {
  const [storeResult, playerResult] = await Promise.allSettled([fetchStoreDetails(id), fetchPlayerCount(id)]);
  const fetchedAt = Date.now();
  const data = storeResult.status === 'fulfilled' ? storeResult.value : null;
  const score = data?.metacritic?.score;
  const store = data
    ? {
        releaseDate: spotlightText(data.release_date?.date),
        shortDescription: spotlightDescription(data.short_description),
        screenshots: data.screenshots.slice(0, 4),
        comingSoon: data.release_date?.coming_soon === true,
        developers: spotlightList(data.developers),
        publishers: spotlightList(data.publishers),
        genres: spotlightList(Array.isArray(data.genres) ? data.genres.map((genre) => genre?.description) : []),
        metacritic: Number.isInteger(score) && score > 0 && score <= 100 ? score : null,
        fetchedAt: data.fetchedAt,
      }
    : null;
  const players =
    playerResult.status === 'fulfilled' && playerResult.value ? { count: playerResult.value.count, fetchedAt } : null;
  return { ok: Boolean(store || players), store, players };
};

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('steam-store-details', async (_event, appid) => {
    const id = validAppId(appid);
    if (!id) return { ok: false, error: 'invalid-appid' };
    try {
      const data = await fetchStoreDetails(id);
      return data ? { ok: true, data } : { ok: false, error: 'store-unavailable' };
    } catch (error) {
      console.warn('[SteamStore] appdetails failed:', error.message);
      return { ok: false, error: 'store-unavailable' };
    }
  });

  ipcMain.handle('steam-player-count', async (_event, appid) => {
    const id = validAppId(appid);
    if (!id) return { ok: false, error: 'invalid-appid' };
    try {
      const data = await fetchPlayerCount(id);
      return data ? { ok: true, ...data } : { ok: false, error: 'players-unavailable' };
    } catch (error) {
      console.warn('[SteamStore] player count failed:', error.message);
      return { ok: false, error: 'players-unavailable' };
    }
  });

  ipcMain.handle('steam-most-played', async () => {
    try {
      const result = await fetchMostPlayed();
      return result.ok ? result : { ok: false, error: 'chart-unavailable' };
    } catch (error) {
      console.warn('[SteamStore] most-played chart failed:', error.message);
      return { ok: false, error: 'chart-unavailable' };
    }
  });

  ipcMain.handle('steam-spotlight', async (_event, appid) => {
    const id = validAppId(appid);
    if (!id) return { ok: false, error: 'invalid-appid' };
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
      const cleanId = typeof steamId === 'string' ? steamId.trim() : '';
      if (!/^\d{17}$/.test(cleanId)) {
        return { success: false, error: 'A valid Steam64 ID is required.', items: [] };
      }
      const items = await fetchSteamWishlist(cleanId);
      const enriched = await enrichWishlistItems(items);
      if (items.length && !enriched.length) {
        throw new Error('Steam returned your wishlist, but game details are unavailable. Please try again later.');
      }
      return {
        success: true,
        count: enriched.length,
        totalFetched: items.length,
        skippedCount: items.length - enriched.length,
        items: enriched,
        error: null,
      };
    } catch (err) {
      console.error('[SteamWishlist] Error:', err.message);
      return { success: false, error: err.message || 'Could not fetch Steam wishlist.', items: [] };
    }
  });

  // ---------------------------------------------------------------------------
  // Steam Friends presence. Calls the GamePilot Netlify relay
  // (/.netlify/functions/getSteamFriends via the /api redirect) so the Steam
  // Web API key stays server-side and never ships in the client bundle.
  // Returns trimmed presence data: name, avatar, state and current game.
  // Cached in-memory for 60s per steamid to bound Steam API usage.
  // ---------------------------------------------------------------------------
  ipcMain.handle('steam-friends', async (_event, steamId) => {
    const cleanId = String(steamId || '').replace(/[^0-9]/g, '');
    if (!/^\d{17}$/.test(cleanId)) return { ok: false, error: 'invalid-steamid' };

    const cached = FRIENDS_CACHE.get(cleanId);
    if (cached && Date.now() < cached.expiresAt) return { ok: true, ...cached.data, cached: true };

    try {
      const res = await httpsRequest(`${STEAM_FRIENDS_RELAY_URL}?steamid=${cleanId}`, null, {
        'User-Agent': 'GamePilot/1.9',
        Accept: 'application/json',
      });
      if (res.status === 403) return { ok: false, error: 'friends-list-private' };
      if (res.status !== 200) return { ok: false, error: 'friends-unavailable' };
      const data = JSON.parse(res.body || '{}');
      if (!Array.isArray(data?.friends)) return { ok: false, error: 'friends-unavailable' };
      const result = {
        friends: data.friends.slice(0, 200),
        fetchedAt: Number(data.fetchedAt) || Date.now(),
      };
      FRIENDS_CACHE.delete(cleanId);
      FRIENDS_CACHE.set(cleanId, { data: result, expiresAt: Date.now() + FRIENDS_CACHE_TTL_MS });
      if (FRIENDS_CACHE.size > 8) FRIENDS_CACHE.delete(FRIENDS_CACHE.keys().next().value);
      return { ok: true, ...result };
    } catch (error) {
      console.warn('[SteamFriends] relay request failed:', error.message);
      return { ok: false, error: 'friends-unavailable' };
    }
  });

  // ---------------------------------------------------------------------------
  // Steam Profile identity. Same relay pattern as friends — GetPlayerSummaries
  // + GetBadges server-side, trimmed public fields only. Level/badge fields are
  // null when the profile's game details are private; that is not an error.
  // ---------------------------------------------------------------------------
  ipcMain.handle('steam-profile', async (_event, steamId) => {
    const cleanId = String(steamId || '').replace(/[^0-9]/g, '');
    if (!/^\d{17}$/.test(cleanId)) return { ok: false, error: 'invalid-steamid' };

    const cached = PROFILE_CACHE.get(cleanId);
    if (cached && Date.now() < cached.expiresAt) return { ok: true, ...cached.data, cached: true };

    try {
      const res = await httpsRequest(`${STEAM_PROFILE_RELAY_URL}?steamid=${cleanId}`, null, {
        'User-Agent': 'GamePilot/1.9',
        Accept: 'application/json',
      });
      if (res.status === 404) return { ok: false, error: 'profile-not-found' };
      if (res.status !== 200) return { ok: false, error: 'profile-unavailable' };
      const data = JSON.parse(res.body || '{}');
      if (!data?.profile || typeof data.profile !== 'object') return { ok: false, error: 'profile-unavailable' };
      const result = { profile: data.profile, fetchedAt: Number(data.fetchedAt) || Date.now() };
      PROFILE_CACHE.delete(cleanId);
      PROFILE_CACHE.set(cleanId, { data: result, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS });
      if (PROFILE_CACHE.size > 8) PROFILE_CACHE.delete(PROFILE_CACHE.keys().next().value);
      return { ok: true, ...result };
    } catch (error) {
      console.warn('[SteamProfile] relay request failed:', error.message);
      return { ok: false, error: 'profile-unavailable' };
    }
  });

  // ---------------------------------------------------------------------------
  // Steam owned games. Same relay pattern as friends/profile — GetOwnedGames
  // server-side so the API key never ships in the bundle. Returns trimmed
  // appid/name/playtime/last-played/icon fields. privateDetails=true means the
  // profile's game details are hidden — honest messaging, not an empty library.
  // Cached 6h per steamid; owned libraries change slowly.
  // ---------------------------------------------------------------------------
  ipcMain.handle('steam-owned-library', async (_event, steamId) => {
    const cleanId = String(steamId || '').replace(/[^0-9]/g, '');
    if (!/^\d{17}$/.test(cleanId)) return { ok: false, error: 'invalid-steamid' };

    const cached = OWNED_CACHE.get(cleanId);
    if (cached && Date.now() < cached.expiresAt) return { ok: true, ...cached.data, cached: true };

    try {
      const res = await httpsRequest(`${STEAM_LIBRARY_RELAY_URL}?steamid=${cleanId}`, null, {
        'User-Agent': 'GamePilot/1.9',
        Accept: 'application/json',
      });
      if (res.status === 403) return { ok: false, error: 'game-details-private' };
      if (res.status !== 200) return { ok: false, error: 'library-unavailable' };
      const data = JSON.parse(res.body || '{}');
      if (!Array.isArray(data?.games)) return { ok: false, error: 'library-unavailable' };
      const result = {
        games: data.games.slice(0, 500),
        privateDetails: data.privateDetails === true,
        fetchedAt: Number(data.fetchedAt) || Date.now(),
      };
      OWNED_CACHE.delete(cleanId);
      OWNED_CACHE.set(cleanId, { data: result, expiresAt: Date.now() + OWNED_CACHE_TTL_MS });
      if (OWNED_CACHE.size > 4) OWNED_CACHE.delete(OWNED_CACHE.keys().next().value);
      return { ok: true, ...result };
    } catch (error) {
      console.warn('[SteamOwned] relay request failed:', error.message);
      return { ok: false, error: 'library-unavailable' };
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
