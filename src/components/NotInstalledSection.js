import React, { useEffect, useMemo, useState } from 'react';
import { HardDriveDownload, RefreshCw } from 'lucide-react';
import SteamOwnedGamesService from '../services/SteamOwnedGamesService';
import { getElectronAPI } from '../services/ElectronBridge';
import { formatPlaytime } from '../utils/formatPlaytime';
import './NotInstalledSection.css';

const INITIAL_ROWS = 18;

const formatLastPlayed = (ms) => {
  if (!ms) return null;
  const date = new Date(Number(ms));
  return Number.isNaN(date.getTime()) ? null : `last played ${date.toLocaleDateString()}`;
};

/**
 * "Owned, not installed" — games you own that aren't on this PC.
 * Steam comes from the opt-in owned-library relay (Settings → Connections);
 * GOG entries are read locally from GOG Galaxy's database (no account, no
 * network). Steam rows get a real install deep-link via steam://install.
 * Hides entirely when neither source has anything to show.
 */
export default function NotInstalledSection({ library = [] }) {
  const [steamGames, setSteamGames] = useState(null);
  const [steamError, setSteamError] = useState(null);
  const [steamLoading, setSteamLoading] = useState(false);
  const [gogGames, setGogGames] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [installing, setInstalling] = useState(null);

  const steamEnabled = SteamOwnedGamesService.isEnabled() && Boolean(SteamOwnedGamesService.getSteamId());

  const loadSteam = React.useCallback(
    async (force = false) => {
      if (!steamEnabled) {
        setSteamGames([]);
        return;
      }
      setSteamLoading(true);
      setSteamError(null);
      try {
        const result = await SteamOwnedGamesService.fetchOwned({ force });
        if (!result.success) {
          setSteamError(result.error || 'Your Steam library is unavailable right now.');
          setSteamGames([]);
          return;
        }
        if (result.privateDetails) {
          setSteamError(
            'Your Steam game details are private. Set "Game details" to public in Steam privacy settings to see owned games here.'
          );
          setSteamGames([]);
          return;
        }
        setSteamGames(SteamOwnedGamesService.diffUninstalled(result.games, library));
      } finally {
        setSteamLoading(false);
      }
    },
    [library, steamEnabled]
  );

  useEffect(() => {
    let cancelled = false;
    loadSteam().catch(() => {});
    const api = getElectronAPI();
    if (api && typeof api.gogUninstalled === 'function') {
      const names = (Array.isArray(library) ? library : []).map((game) => game?.name).filter(Boolean);
      api
        .gogUninstalled(names)
        .then((result) => {
          if (!cancelled) setGogGames(result?.ok && Array.isArray(result.games) ? result.games : []);
        })
        .catch(() => {
          if (!cancelled) setGogGames([]);
        });
    } else {
      setGogGames([]);
    }
    return () => {
      cancelled = true;
    };
  }, [library, loadSteam]);

  const rows = useMemo(() => {
    const steam = (Array.isArray(steamGames) ? steamGames : []).map((game) => ({ ...game, source: 'steam' }));
    const gog = (Array.isArray(gogGames) ? gogGames : []).map((game) => ({ ...game, source: 'gog' }));
    return [...steam, ...gog].sort((a, b) => (b.playtimeForever || 0) - (a.playtimeForever || 0));
  }, [steamGames, gogGames]);

  const visibleRows = expanded ? rows : rows.slice(0, INITIAL_ROWS);
  const hiddenCount = rows.length - visibleRows.length;

  if (rows.length === 0 && !steamLoading && !steamError) return null;

  const handleInstall = async (game) => {
    const api = getElectronAPI();
    if (!api || typeof api.steamInstall !== 'function' || !game?.appid) return;
    setInstalling(game.appid);
    try {
      await api.steamInstall(String(game.appid));
    } finally {
      setInstalling(null);
    }
  };

  return (
    <section className="not-installed" aria-label="Owned games that are not installed">
      <div className="not-installed-header">
        <div className="not-installed-heading">
          <HardDriveDownload size={16} aria-hidden="true" />
          <h2>Owned, not installed</h2>
          {rows.length > 0 && <span className="not-installed-count">{rows.length}</span>}
        </div>
        {steamEnabled && (
          <button
            type="button"
            className="not-installed-refresh"
            onClick={() => loadSteam(true)}
            disabled={steamLoading}
            aria-label="Refresh owned games"
          >
            <RefreshCw size={13} aria-hidden="true" />
            {steamLoading ? 'Checking…' : 'Refresh'}
          </button>
        )}
      </div>
      <p className="not-installed-sub">
        Games you own that aren&apos;t on this PC. Steam needs the owned-games toggle in Settings; GOG comes from GOG
        Galaxy&apos;s local data. Steam free games appear only if they have recorded playtime.
      </p>

      {steamError && (
        <div className="not-installed-error" role="status">
          {steamError}
          <button type="button" onClick={() => loadSteam(true)}>
            Retry
          </button>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <ul className="not-installed-list">
            {visibleRows.map((game) => (
              <li key={`${game.source}-${game.appid || game.releaseKey || game.name}`} className="not-installed-row">
                <span className="not-installed-icon">
                  {game.icon ? (
                    <img src={game.icon} alt="" loading="lazy" />
                  ) : (
                    <span className="not-installed-icon-fallback" aria-hidden="true">
                      {game.platform === 'GOG' ? 'G' : 'S'}
                    </span>
                  )}
                </span>
                <span className="not-installed-info">
                  <span className="not-installed-name">{game.name}</span>
                  <span className="not-installed-meta">
                    {game.platform}
                    {game.playtimeForever > 0 ? ` · ${formatPlaytime(game.playtimeForever)} played` : ''}
                    {formatLastPlayed(game.lastPlayed) ? ` · ${formatLastPlayed(game.lastPlayed)}` : ''}
                  </span>
                </span>
                {game.source === 'steam' ? (
                  <button
                    type="button"
                    className="not-installed-install"
                    onClick={() => handleInstall(game)}
                    disabled={installing === game.appid}
                  >
                    {installing === game.appid ? 'Opening Steam…' : 'Install'}
                  </button>
                ) : (
                  <span className="not-installed-via">via GOG Galaxy</span>
                )}
              </li>
            ))}
          </ul>
          {hiddenCount > 0 && (
            <button type="button" className="not-installed-more" onClick={() => setExpanded(true)}>
              Show {hiddenCount} more
            </button>
          )}
        </>
      )}
    </section>
  );
}
