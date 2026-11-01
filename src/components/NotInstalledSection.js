import React, { useEffect, useMemo, useState } from 'react';
import { HardDriveDownload, RefreshCw } from 'lucide-react';
import SteamOwnedGamesService from '../services/SteamOwnedGamesService';
import EpicAccountService from '../services/EpicAccountService';
import ItchAccountService from '../services/ItchAccountService';
import OwnedEnrichmentService from '../services/OwnedEnrichmentService';
import PendingInstallService from '../services/PendingInstallService';
import { getElectronAPI, openExternalUrl } from '../services/ElectronBridge';
import { formatPlaytime } from '../utils/formatPlaytime';
import OwnedGameModal from './OwnedGameModal';
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
 * network); Epic entries come from a linked Epic account (Settings →
 * Connections). Steam rows deep-link via steam://install; GOG rows open the
 * game page in GOG Galaxy via goggalaxy://openGameView; Epic rows open the
 * game page in the Epic launcher via com.epicgames.launcher://.
 * Hides entirely when no source has anything to show.
 */
export default function NotInstalledSection({ library = [] }) {
  const [steamGames, setSteamGames] = useState(null);
  const [steamError, setSteamError] = useState(null);
  const [steamLoading, setSteamLoading] = useState(false);
  const [gogGames, setGogGames] = useState(null);
  const [epicGames, setEpicGames] = useState(null);
  const [epicError, setEpicError] = useState(null);
  const [epicLoading, setEpicLoading] = useState(false);
  const [itchGames, setItchGames] = useState(null);
  const [itchError, setItchError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [installing, setInstalling] = useState(null);
  const [modalGame, setModalGame] = useState(null);

  const steamEnabled = SteamOwnedGamesService.isEnabled() && Boolean(SteamOwnedGamesService.getSteamId());
  const epicLinked = EpicAccountService.isLinked();
  const itchConfigured = ItchAccountService.isConfigured();

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

  const loadEpic = React.useCallback(
    async (force = false) => {
      if (!epicLinked) {
        setEpicGames([]);
        return;
      }
      setEpicLoading(true);
      setEpicError(null);
      try {
        const result = await EpicAccountService.getOwned({ force });
        if (!result.success) {
          setEpicError(result.error || 'Your Epic library is unavailable right now.');
          setEpicGames([]);
          return;
        }
        setEpicGames(EpicAccountService.diffUninstalled(result.games, library));
      } finally {
        setEpicLoading(false);
      }
    },
    [library, epicLinked]
  );

  const loadItch = React.useCallback(
    async (force = false) => {
      if (!itchConfigured) {
        setItchGames([]);
        return;
      }
      try {
        const result = await ItchAccountService.getOwned({ force });
        if (!result.success) {
          setItchError(result.error || 'Your itch library is unavailable right now.');
          setItchGames([]);
          return;
        }
        setItchError(null);
        setItchGames(ItchAccountService.diffUninstalled(result.games, library));
      } catch {
        setItchGames([]);
      }
    },
    [library, itchConfigured]
  );

  const handleRefresh = React.useCallback(() => {
    loadSteam(true).catch(() => {});
    loadEpic(true).catch(() => {});
    loadItch(true).catch(() => {});
  }, [loadSteam, loadEpic, loadItch]);

  useEffect(() => {
    let cancelled = false;
    PendingInstallService.sync();
    loadSteam().catch(() => {});
    loadEpic().catch(() => {});
    loadItch().catch(() => {});
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
  }, [library, loadSteam, loadEpic, loadItch]);

  const rows = useMemo(() => {
    const steam = (Array.isArray(steamGames) ? steamGames : []).map((game) => ({ ...game, source: 'steam' }));
    const gog = (Array.isArray(gogGames) ? gogGames : []).map((game) => ({ ...game, source: 'gog' }));
    const epic = (Array.isArray(epicGames) ? epicGames : []).map((game) => ({ ...game, source: 'epic' }));
    const itch = (Array.isArray(itchGames) ? itchGames : []).map((game) => ({ ...game, source: 'itch' }));
    return OwnedEnrichmentService.enrichGames([...steam, ...gog, ...epic, ...itch]).sort(
      (a, b) => (b.playtimeForever || 0) - (a.playtimeForever || 0)
    );
  }, [steamGames, gogGames, epicGames, itchGames]);

  const visibleRows = expanded ? rows : rows.slice(0, INITIAL_ROWS);
  const hiddenCount = rows.length - visibleRows.length;
  const loading = steamLoading || epicLoading;

  if (rows.length === 0 && !loading && !steamError && !epicError && !itchError) return null;

  const installingKey = (game) =>
    game?.source === 'steam'
      ? game.appid
      : game?.source === 'epic'
        ? game.appName
        : game?.source === 'itch'
          ? `itch-${game.itchId}`
          : game?.gogProductId;

  const routeInstall = async (game) => {
    const key = installingKey(game);
    if (!key) return;
    setInstalling(key);
    try {
      if (game.source === 'itch') {
        // itch installs can't be detected locally — just open the game page.
        if (game.url) await openExternalUrl(game.url);
        return;
      }
      await PendingInstallService.installOwnedGame(game);
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
        {(steamEnabled || epicLinked) && (
          <button
            type="button"
            className="not-installed-refresh"
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Refresh owned games"
          >
            <RefreshCw size={13} aria-hidden="true" />
            {loading ? 'Checking…' : 'Refresh'}
          </button>
        )}
      </div>
      <p className="not-installed-sub">
        Games you own that aren&apos;t on this PC. Steam needs the owned-games toggle in Settings; GOG comes from GOG
        Galaxy&apos;s local data; Epic needs a linked Epic account; itch needs an API key. Steam free games appear only
        if they have recorded playtime.
      </p>

      {steamError && (
        <div className="not-installed-error" role="status">
          {steamError}
          <button type="button" onClick={() => loadSteam(true)}>
            Retry
          </button>
        </div>
      )}

      {epicError && (
        <div className="not-installed-error" role="status">
          {epicError}
          <button type="button" onClick={() => loadEpic(true)}>
            Retry
          </button>
        </div>
      )}

      {itchError && (
        <div className="not-installed-error" role="status">
          {itchError}
          <button type="button" onClick={() => loadItch(true)}>
            Retry
          </button>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <ul className="not-installed-list">
            {visibleRows.map((game) => (
              <li
                key={`${game.source}-${game.appid || game.releaseKey || game.catalogItemId || game.appName || game.itchId || game.name}`}
                className="not-installed-row"
                role="button"
                aria-label={`${game.name} — owned on ${game.platform}, not installed`}
                tabIndex={0}
                onClick={() => setModalGame(game)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setModalGame(game);
                  }
                }}
              >
                <span className="not-installed-icon">
                  {game.icon ? (
                    <img src={game.icon} alt="" loading="lazy" />
                  ) : (
                    <span className="not-installed-icon-fallback" aria-hidden="true">
                      {game.platform === 'GOG'
                        ? 'G'
                        : game.platform === 'Epic'
                          ? 'E'
                          : game.platform === 'itch.io'
                            ? 'I'
                            : 'S'}
                    </span>
                  )}
                </span>
                <span className="not-installed-info">
                  <span className="not-installed-name">{game.name}</span>
                  <span className="not-installed-meta">
                    {game.platform}
                    {game.playtimeForever > 0 ? ` · ${formatPlaytime(game.playtimeForever)} played` : ''}
                    {formatLastPlayed(game.lastPlayed) ? ` · ${formatLastPlayed(game.lastPlayed)}` : ''}
                    {game.freebie ? ` · Previously offered free on ${game.freebie.platform}` : ''}
                    {game.alsoOwnedOn?.length ? ` · Same title on ${game.alsoOwnedOn.join(' + ')}` : ''}
                    {game.relatedOwnedOn?.length
                      ? ` · Possible other edition on ${game.relatedOwnedOn.join(' + ')}`
                      : ''}
                  </span>
                </span>
                <button
                  type="button"
                  className="not-installed-install"
                  onClick={(event) => {
                    event.stopPropagation();
                    routeInstall(game);
                  }}
                  disabled={!installingKey(game) || installing === installingKey(game)}
                  title={
                    game.source === 'epic'
                      ? 'Opens the game in the Epic launcher — press Install there'
                      : game.source === 'gog'
                        ? 'Opens the game page in GOG Galaxy'
                        : game.source === 'itch'
                          ? 'Opens the game page on itch.io'
                          : 'Starts the install in Steam'
                  }
                >
                  {installing === installingKey(game)
                    ? game.source === 'steam'
                      ? 'Opening Steam…'
                      : game.source === 'epic'
                        ? 'Opening Epic…'
                        : game.source === 'itch'
                          ? 'Opening itch.io…'
                          : 'Opening Galaxy…'
                    : game.source === 'steam'
                      ? 'Install'
                      : game.source === 'epic'
                        ? 'Install via Epic'
                        : game.source === 'itch'
                          ? 'Open on itch.io'
                          : 'Install via Galaxy'}
                </button>
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

      {modalGame && (
        <OwnedGameModal
          game={modalGame}
          onClose={() => setModalGame(null)}
          onInstall={(game) => {
            setModalGame(null);
            routeInstall(game);
          }}
          installing={
            installing === modalGame.appid ||
            installing === modalGame.appName ||
            installing === modalGame.gogProductId ||
            installing === `itch-${modalGame.itchId}`
          }
        />
      )}
    </section>
  );
}
