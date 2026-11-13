const { Notification } = require('electron');
const { fetchSteamFriends } = require('./steam');

// OS notifications + the background friends watcher.
//
// Two notification sources:
//  - 'notify' — renderer-fired toasts (wishlist deals etc.) for events that
//    happen while the app is open.
//  - Friends watch — main-process poll every few minutes of the friends
//    relay, so "a friend just started a game you own" reaches you even when
//    the window is closed to the tray. The renderer registers the Steam64 ID
//    and owned game names (local data, never persisted here); enabling is
//    opt-in from Settings.
//
// Clicking any toast focuses the main window. Windows' own Focus Assist /
// quiet hours govern delivery timing — we deliberately don't reimplement it.

const FRIENDS_POLL_MS = 5 * 60 * 1000;
const MAX_NAME_LEN = 200;

const normalizeTitle = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function registerIpcHandlers(ipcMain, deps = {}) {
  const { getMainWindow } = deps;

  const show = ({ title, body }) => {
    if (!Notification.isSupported()) return { ok: false, error: 'unsupported' };
    const note = new Notification({
      title: String(title || 'GamePilot').slice(0, 120),
      body: String(body || '').slice(0, 300),
      silent: false,
    });
    note.on('click', () => {
      const win = getMainWindow?.();
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      }
    });
    note.show();
    return { ok: true };
  };

  let watchTimer = null;
  let watchState = null; // { steamId, owned:Set, seenPlaying:Map(steamid->playing) }

  const pollFriends = async () => {
    if (!watchState) return;
    const result = await fetchSteamFriends(watchState.steamId);
    if (!result.ok || !Array.isArray(result.friends)) return;
    const nowPlaying = new Map();
    result.friends.forEach((friend) => {
      if (friend?.steamid && friend?.playing) {
        nowPlaying.set(String(friend.steamid), String(friend.playing).slice(0, MAX_NAME_LEN));
      }
    });
    if (watchState.seenPlaying !== null) {
      // Find friends who started something we own since the last poll.
      // Group by game so "two friends in Zomboid" is one toast, not two.
      const started = new Map();
      nowPlaying.forEach((game, steamid) => {
        if (watchState.seenPlaying.get(steamid) === game) return;
        if (!watchState.owned.has(normalizeTitle(game))) return;
        const entry = started.get(game) || [];
        const friend = result.friends.find((f) => String(f?.steamid) === steamid);
        entry.push(String(friend?.name || 'A friend').slice(0, 60));
        started.set(game, entry);
      });
      let shown = 0;
      started.forEach((names, game) => {
        if (shown >= 3) return;
        shown += 1;
        show({
          title: names.length > 1 ? `${names.length} friends are playing` : `${names[0]} is playing`,
          body: `${game} — you own this too`,
        });
      });
    }
    watchState.seenPlaying = nowPlaying;
  };

  const stopWatch = () => {
    if (watchTimer) clearInterval(watchTimer);
    watchTimer = null;
    watchState = null;
  };

  ipcMain.handle('notifications:configure-friends-watch', async (_event, payload = {}) => {
    stopWatch();
    if (!payload?.enabled) return { ok: true, watching: false };
    const steamId = String(payload?.steamId || '').replace(/[^0-9]/g, '');
    if (!/^\d{17}$/.test(steamId)) return { ok: false, error: 'invalid-steamid', watching: false };
    const owned = new Set(
      (Array.isArray(payload?.ownedNames) ? payload.ownedNames : []).map(normalizeTitle).filter(Boolean).slice(0, 5000)
    );
    // seenPlaying starts null — first poll establishes the baseline rather
    // than toasting for everyone already in-game.
    watchState = { steamId, owned, seenPlaying: null };
    await pollFriends();
    watchTimer = setInterval(pollFriends, FRIENDS_POLL_MS);
    if (watchTimer.unref) watchTimer.unref();
    return { ok: true, watching: true };
  });

  ipcMain.handle('notifications:notify', (_event, payload = {}) => show(payload));

  ipcMain.handle('notifications:supported', () => ({ ok: true, supported: Notification.isSupported() }));
}

module.exports = { registerIpcHandlers };
