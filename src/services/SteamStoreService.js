export const getSteamAppId = (game) => {
  if (String(game?.platform || '').toLowerCase() !== 'steam') return null;
  const raw = game.appid ?? game.steam_appid ?? game.steamAppId ?? game.appId ?? game.app_id;
  const id = String(raw ?? '');
  return /^[1-9]\d{0,9}$/.test(id) && Number(id) <= 4294967295 ? id : null;
};

export const getSteamStoreDetails = async (appid) => {
  const api = typeof window !== 'undefined' && window.electronAPI?.steamStoreDetails;
  if (!api) throw new Error('Steam store details are available in the desktop app.');
  const result = await api(appid);
  if (!result?.ok || String(result.data?.steam_appid) !== String(appid)) {
    throw new Error('Steam store details are temporarily unavailable.');
  }
  return result.data;
};
