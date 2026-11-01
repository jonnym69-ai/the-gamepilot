/**
 * Epic account linking via Epic's own OAuth flow.
 *
 * Opens a small login window on epicgames.com; once the user lands on Epic's
 * /id/api/redirect endpoint the authorization code is read off the page and
 * exchanged for OAuth tokens. The refresh token is encrypted with safeStorage
 * (DPAPI on Windows) and stored in userData — tokens never leave this PC
 * except to Epic itself, and only the owned-library endpoint is ever called.
 *
 * Uses the Epic Games launcher's public OAuth client credentials — the same
 * approach open-source tools like Legendary take. It is not an officially
 * supported third-party API, so it may break without notice; linking is
 * strictly opt-in and detection-based Epic scanning works without it.
 */

const { app, BrowserWindow, safeStorage, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { httpsRequest } = require('./net');

const CLIENT_ID = '34a02cf8f4414e29b15921876da36f9a';
const CLIENT_SECRET = 'daafbccc737745039dffe53d94fc76cf';
const REDIRECT_PATH = 'https://www.epicgames.com/id/api/redirect';
const AUTHORIZE_URL = `${REDIRECT_PATH}?clientId=${CLIENT_ID}&responseType=code`;
const LOGIN_URL = `https://www.epicgames.com/id/login?redirectUrl=${encodeURIComponent(AUTHORIZE_URL)}`;
const TOKEN_URL = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';
const LIBRARY_URL = 'https://library-service.live.use1a.on.epicgames.com/library/api/public/items';
const CATALOG_URL = 'https://catalog-public-service-prod06.ol.epicgames.com/catalog/api/shared';
const AUTH_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_LIBRARY_PAGES = 20;
const CATALOG_BATCH_SIZE = 50;

// Epic tool/plugin entries that show up in owned libraries but aren't games.
const NON_GAME_APP_NAME =
  /^(UE_|UnrealEngine|QuixelBridge|FabPlugin|Twinmotion|RealityScan|MetaHuman|Datasmith|EpicGamesLauncher)/i;

const AUTH_HEADER = `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`;

let authWindow = null;
let accessTokenCache = null; // { accessToken, expiresAt }

const tokenFilePath = () => path.join(app.getPath('userData'), 'epic-account.json');

const loadStoredAuth = () => {
  try {
    const raw = fs.readFileSync(tokenFilePath(), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed?.v !== 1 || typeof parsed.token !== 'string' || !safeStorage.isEncryptionAvailable()) return null;
    const refreshToken = safeStorage.decryptString(Buffer.from(parsed.token, 'base64'));
    if (!refreshToken) return null;
    return {
      refreshToken,
      accountId: typeof parsed.accountId === 'string' ? parsed.accountId : null,
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : null,
    };
  } catch {
    return null;
  }
};

const saveStoredAuth = ({ refreshToken, accountId, displayName }) => {
  const encrypted = safeStorage.encryptString(refreshToken).toString('base64');
  const payload = { v: 1, token: encrypted, accountId: accountId || null, displayName: displayName || null };
  fs.writeFileSync(tokenFilePath(), JSON.stringify(payload), 'utf8');
};

const clearStoredAuth = () => {
  accessTokenCache = null;
  try {
    fs.unlinkSync(tokenFilePath());
  } catch {}
};

const exchangeToken = async (body) => {
  const response = await httpsRequest(TOKEN_URL, body, {
    Authorization: AUTH_HEADER,
    'Content-Type': 'application/x-www-form-urlencoded',
  });
  const data = (() => {
    try {
      return JSON.parse(response.body);
    } catch {
      return null;
    }
  })();
  if (response.status !== 200 || !data?.access_token) {
    const error = new Error('token-failed');
    error.grantError = typeof data?.errorCode === 'string' ? data.errorCode : null;
    throw error;
  }
  return data;
};

const cacheAccessToken = (data) => {
  const ttl = Number(data?.expires_in) > 0 ? Number(data.expires_in) : 7200;
  accessTokenCache = { accessToken: data.access_token, expiresAt: Date.now() + ttl * 1000 };
};

const getAccessToken = async () => {
  if (accessTokenCache && Date.now() < accessTokenCache.expiresAt - 60 * 1000) {
    return accessTokenCache.accessToken;
  }
  const stored = loadStoredAuth();
  if (!stored?.refreshToken) return null;
  try {
    const data = await exchangeToken(
      `grant_type=refresh_token&refresh_token=${encodeURIComponent(stored.refreshToken)}&token_type=eg1`
    );
    cacheAccessToken(data);
    // Epic rotates refresh tokens on some grant responses — persist the new one.
    if (data.refresh_token && data.refresh_token !== stored.refreshToken) {
      saveStoredAuth({ ...stored, refreshToken: data.refresh_token });
    }
    return data.access_token;
  } catch (error) {
    if (error?.grantError?.includes('invalid_grant')) {
      clearStoredAuth();
      throw Object.assign(new Error('reauth-required'), { code: 'reauth-required' });
    }
    throw error;
  }
};

const isGameRecord = (record) => {
  const categories = Array.isArray(record?.categories) ? record.categories : [];
  if (categories.length === 0) return true;
  return categories.some((category) => String(category?.path || '').startsWith('games'));
};

const pickImage = (metadata) => {
  const images = Array.isArray(metadata?.keyImages) ? metadata.keyImages : [];
  const preferred = [
    'DieselStoreFrontTall',
    'DieselGameBoxTall',
    'OfferImageTall',
    'CodeRedemption_340x440',
    'DieselStoreFrontWide',
    'DieselGameBox',
    'OfferImageWide',
    'Thumbnail',
    'VaultClosedImage',
    'featured',
  ];
  for (const type of preferred) {
    const url = images.find((image) => image?.type === type && /^https:\/\//.test(image?.url || ''))?.url;
    if (url) return url;
  }
  // Older catalog entries use one-off type names — take any https image.
  return images.find((image) => /^https:\/\//.test(image?.url || ''))?.url || '';
};

const normalizeRecord = (record) => {
  const title = String(record?.metadata?.title || record?.appName || '').trim();
  const appName = String(record?.appName || '').trim();
  if (!appName || !title) return null;
  return {
    appName,
    catalogItemId: typeof record?.catalogItemId === 'string' ? record.catalogItemId : null,
    namespace: typeof record?.namespace === 'string' ? record.namespace : null,
    title,
    image: pickImage(record?.metadata),
  };
};

// Most library records arrive without metadata (older freebie claims), so
// titles/artwork are resolved in bulk through Epic's catalog API by
// (namespace, catalogItemId) — the same path Legendary takes.
const fetchCatalogBatch = async (accessToken, namespace, catalogItemIds) => {
  const params = catalogItemIds.map((id) => `id=${encodeURIComponent(id)}`).join('&');
  const url = `${CATALOG_URL}/namespace/${encodeURIComponent(namespace)}/bulk/items?${params}&includeMetadata=true&country=US&locale=en-US`;
  const response = await httpsRequest(url, null, {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  });
  if (response?.status !== 200) return null;
  try {
    return JSON.parse(response.body) || null;
  } catch {
    return null;
  }
};

const enrichFromCatalog = async (accessToken, games) => {
  const byNamespace = new Map();
  for (const game of games) {
    if (!game.catalogItemId || !game.namespace) continue;
    if (!byNamespace.has(game.namespace)) byNamespace.set(game.namespace, []);
    byNamespace.get(game.namespace).push(game);
  }
  for (const [namespace, namespaceGames] of byNamespace) {
    for (let i = 0; i < namespaceGames.length; i += CATALOG_BATCH_SIZE) {
      const chunk = namespaceGames.slice(i, i + CATALOG_BATCH_SIZE);
      const data = await fetchCatalogBatch(
        accessToken,
        namespace,
        chunk.map((game) => game.catalogItemId)
      );
      if (!data) continue;
      for (const game of chunk) {
        const item = data[game.catalogItemId];
        if (!item || typeof item !== 'object') continue;
        const categories = Array.isArray(item.categories) ? item.categories : null;
        if (categories) game.catalogCategories = categories;
        const title = String(item.title || '').trim();
        if (title) game.catalogTitle = title;
        const image = pickImage(item);
        if (image) game.catalogImage = image;
        const description = String(item.description || item.longDescription || '').trim();
        if (description) game.catalogDescription = description;
      }
    }
  }
};

const fetchLibraryPage = async (accessToken, cursor) => {
  const url = cursor
    ? `${LIBRARY_URL}?includeMetadata=true&cursor=${encodeURIComponent(cursor)}`
    : `${LIBRARY_URL}?includeMetadata=true`;
  const response = await httpsRequest(url, null, {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/json',
  });
  if (response?.status !== 200) return null;
  try {
    return JSON.parse(response.body);
  } catch {
    return null;
  }
};

const runLoginFlow = (parentWindow) =>
  new Promise((resolve) => {
    if (authWindow && !authWindow.isDestroyed()) {
      authWindow.focus();
      resolve({ ok: false, error: 'already-open' });
      return;
    }

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const win = authWindow;
      authWindow = null;
      if (win && !win.isDestroyed()) win.close();
      resolve(result);
    };

    authWindow = new BrowserWindow({
      parent: parentWindow || undefined,
      width: 560,
      height: 760,
      autoHideMenuBar: true,
      title: 'Sign in to Epic Games',
      webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
    });

    const timer = setTimeout(() => finish({ ok: false, error: 'timed-out' }), AUTH_TIMEOUT_MS);
    authWindow.on('closed', () => finish({ ok: false, error: 'cancelled' }));

    // Anything the login flow tries to pop out (store links, help pages) opens
    // in the system browser instead of spawning an app window.
    authWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(() => {});
      return { action: 'deny' };
    });

    const tryExtractCode = async () => {
      const win = authWindow;
      if (!win || win.isDestroyed()) return;
      const url = win.webContents.getURL();
      if (!url.startsWith(REDIRECT_PATH)) return;
      try {
        const text = await win.webContents.executeJavaScript('document.body ? document.body.innerText : ""');
        const match = String(text).match(/"authorizationCode"\s*:\s*"([0-9a-f]{32})"/i);
        if (match) finish({ ok: true, code: match[1] });
      } catch {
        // Page not readable yet — the next navigation event retries.
      }
    };

    authWindow.webContents.on('did-finish-load', tryExtractCode);
    authWindow.webContents.on('did-navigate', tryExtractCode);
    authWindow.loadURL(LOGIN_URL).catch(() => finish({ ok: false, error: 'load-failed' }));
  });

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('epic-auth-start', async (event) => {
    try {
      if (!safeStorage.isEncryptionAvailable()) return { ok: false, error: 'secure-storage-unavailable' };
      const parent = BrowserWindow.fromWebContents(event.sender);
      const result = await runLoginFlow(parent);
      if (!result.ok) return result;
      const data = await exchangeToken(`grant_type=authorization_code&code=${result.code}&token_type=eg1`);
      if (!data.refresh_token) return { ok: false, error: 'token-failed' };
      const accountId = typeof data.account_id === 'string' ? data.account_id : null;
      const displayName = typeof data.displayName === 'string' ? data.displayName : null;
      saveStoredAuth({ refreshToken: data.refresh_token, accountId, displayName });
      cacheAccessToken(data);
      return { ok: true, accountId, displayName };
    } catch {
      return { ok: false, error: 'token-failed' };
    }
  });

  ipcMain.handle('epic-auth-status', async () => {
    const stored = loadStoredAuth();
    if (!stored) return { ok: true, linked: false };
    return { ok: true, linked: true, accountId: stored.accountId, displayName: stored.displayName };
  });

  ipcMain.handle('epic-auth-disconnect', async () => {
    clearStoredAuth();
    return { ok: true };
  });

  ipcMain.handle('epic-owned-library', async () => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return { ok: false, error: 'not-linked' };
      const games = [];
      const seen = new Set();
      let cursor = null;
      for (let page = 0; page < MAX_LIBRARY_PAGES; page += 1) {
        const data = await fetchLibraryPage(accessToken, cursor);
        if (!data) break;
        for (const record of Array.isArray(data.records) ? data.records : []) {
          if (!isGameRecord(record)) continue;
          const normalized = normalizeRecord(record);
          if (!normalized || seen.has(normalized.appName)) continue;
          seen.add(normalized.appName);
          games.push(normalized);
        }
        const nextCursor = data?.responseMetadata?.nextCursor;
        if (typeof nextCursor !== 'string' || !nextCursor || nextCursor === cursor) break;
        cursor = nextCursor;
      }
      await enrichFromCatalog(accessToken, games).catch(() => {});
      const filtered = games
        .filter((game) => {
          if (NON_GAME_APP_NAME.test(game.appName)) return false;
          // When the catalog resolved the item, trust its categories — a
          // resolved non-'games' item (tools, plugins, apps) is not a game.
          if (
            Array.isArray(game.catalogCategories) &&
            game.catalogCategories.length > 0 &&
            !game.catalogCategories.some((category) => String(category?.path || '').startsWith('games'))
          ) {
            return false;
          }
          return true;
        })
        .map((game) => ({
          appName: game.appName,
          catalogItemId: game.catalogItemId,
          title: game.catalogTitle || game.title,
          image: game.catalogImage || game.image,
          description: game.catalogDescription || null,
        }));
      return { ok: true, games: filtered.slice(0, 2000) };
    } catch (error) {
      if (error?.code === 'reauth-required') return { ok: false, error: 'reauth-required' };
      return { ok: false, error: 'epic-library-unavailable' };
    }
  });

  ipcMain.handle('epic-open-app', async (_event, appName) => {
    // Epic app names are alphanumeric plus _ . - (e.g. 'Fortnite', 'au_naturel',
    // hex ids like 'b7e5c5e5d0e44ff18a7d9f4c8e8bfe01').
    if (typeof appName !== 'string' || !/^[A-Za-z0-9._-]{2,80}$/.test(appName)) return false;
    try {
      await shell.openExternal(`com.epicgames.launcher://apps/${appName}?action=launch`);
      return true;
    } catch {
      return false;
    }
  });
}

module.exports = { registerIpcHandlers };
