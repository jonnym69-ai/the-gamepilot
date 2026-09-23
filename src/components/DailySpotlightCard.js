import React, { useEffect, useId, useState } from 'react';
import { BookOpen } from 'lucide-react';
import DailySpotlightService from '../services/DailySpotlightService';
import { getDateKey } from '../services/DateKeyService';
import { getBlendedPlaytimeMinutes } from '../services/gameClassification';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import LazyImage from './LazyImage';
import './DailySpotlightCard.css';

const text = (value) => (typeof value === 'string' ? value.trim().slice(0, 160) : '');
const names = (value) =>
  (Array.isArray(value) ? value : [value])
    .map((entry) => text(typeof entry === 'object' && entry ? entry.name || entry.description : entry))
    .filter(Boolean)
    .slice(0, 4)
    .join(', ');
const checkedAt = (value) => {
  const date = new Date(value);
  return Number.isFinite(value) && value > 0 && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '';
};

function SpotlightDetails({ game, day }) {
  const id = useId();
  const appid = DailySpotlightService.getSteamAppId(game);
  const [enabled, setEnabled] = useState(() => DailySpotlightService.isEnabled());
  const [facts, setFacts] = useState(() => DailySpotlightService.getCached(game));
  const [status, setStatus] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const onOnline = () => setRefresh((value) => value + 1);
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  useEffect(() => {
    let active = true;
    if (!appid || !enabled) {
      setStatus('');
      return undefined;
    }
    if (!window.electronAPI?.steamSpotlight) {
      setStatus('Online facts are available in the desktop app.');
      return undefined;
    }
    setStatus('Checking saved and online facts…');
    DailySpotlightService.getFacts({ platform: 'steam', appid }).then((result) => {
      if (!active) return;
      setFacts(result);
      const latest = Math.max(result?.store?.fetchedAt || 0, result?.players?.fetchedAt || 0);
      setStatus(
        latest > 0
          ? 'Showing saved facts with source timestamps.'
          : 'Online facts are unavailable. Your library details are still here.'
      );
    });
    return () => {
      active = false;
    };
  }, [appid, enabled, day, refresh]);

  const store = facts?.store;
  const players = facts?.players;
  const gameName = text(game.name || game.title);
  const localRelease = game.releaseDate || game.release_date || game.releaseYear;
  const release = store
    ? text(store.releaseDate)
    : text(localRelease?.date || localRelease) ||
      (Number.isInteger(localRelease) && localRelease >= 1970 && localRelease <= 2100 ? String(localRelease) : '');
  const developer = names(store ? store.developers : game.developers || game.developer);
  const publisher = names(store ? store.publishers : game.publishers || game.publisher);
  const rows = [
    [store ? (store.comingSoon ? 'Planned Steam release' : 'Steam release') : 'Release · library', release],
    [publisher === developer ? 'Developer / publisher' : 'Developer', developer],
    ['Publisher', publisher !== developer ? publisher : ''],
    ['Genres', names(store ? store.genres : game.genres || game.genre)],
  ].filter(([, value]) => value);
  if (Number.isInteger(store?.metacritic) && store.metacritic > 0 && store.metacritic <= 100) {
    rows.push(['Metacritic via Steam', `${store.metacritic} / 100`]);
  }
  const minutes = getBlendedPlaytimeMinutes(game);
  const playtime =
    minutes > 0 ? `${(minutes / 60).toLocaleString(undefined, { maximumFractionDigits: 1 })}h` : 'No playtime recorded';
  const { artwork, fallbackSrc, placeholder } = resolveGameArtworkBundle(
    { ...game, appid, app_id: null, steamAppId: null },
    { surface: 'wide', fallbackSurface: 'hero' }
  );
  const showPlayers = Number.isSafeInteger(players?.count) && players.count >= 0 && checkedAt(players.fetchedAt);

  return (
    <section className="daily-spotlight" aria-labelledby={`${id}-heading`}>
      <header className="daily-spotlight-heading">
        <BookOpen size={17} aria-hidden="true" />
        <h2 id={`${id}-heading`}>Today's Spotlight</h2>
        <time dateTime={day}>{day}</time>
      </header>
      <div className="daily-spotlight-art">
        <LazyImage src={artwork} fallbackSrc={fallbackSrc} placeholder={placeholder} alt={`${gameName} artwork`} />
      </div>
      <div className="daily-spotlight-body">
        <p className="daily-spotlight-eyebrow">From your library · daily discovery</p>
        <h3>{gameName}</h3>
        {rows.length > 0 && (
          <dl className="daily-spotlight-facts">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {store && checkedAt(store.fetchedAt) ? (
          <p className="daily-spotlight-source">Source: Steam store · checked {checkedAt(store.fetchedAt)}.</p>
        ) : rows.length > 0 ? (
          <p className="daily-spotlight-source">Facts from your saved library.</p>
        ) : null}
        {showPlayers && (
          <div className="daily-spotlight-players">
            <strong>{players.count.toLocaleString()}</strong>
            <span>Concurrent Steam players</span>
            <small>
              Source: Steam Web API · checked {checkedAt(players.fetchedAt)}. A snapshot, not a live counter; excludes
              offline players.
            </small>
          </div>
        )}
        <dl className="daily-spotlight-personal">
          <div>
            <dt>Your library playtime</dt>
            <dd>{playtime}</dd>
          </div>
          <div>
            <dt>Your platform</dt>
            <dd>{text(game.platform) || 'Local'}</dd>
          </div>
        </dl>
        {!appid && (
          <p className="daily-spotlight-source">
            Online facts currently cover Steam games. No sales or player counts are inferred for other platforms.
          </p>
        )}
        <label className="daily-spotlight-toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => {
              DailySpotlightService.setEnabled(event.target.checked);
              setEnabled(DailySpotlightService.isEnabled());
            }}
          />
          Online Steam facts for Spotlight
        </label>
        <details className="daily-spotlight-options">
          <summary>About these facts &amp; privacy</summary>
          <p>
            Off by default. When enabled, Spotlight sends only the featured game's public app ID to Steam. No account,
            play history or full library is sent. Artwork uses the same loading as your library.
          </p>
          <p>
            Facts are saved locally and normally refreshed once a day. Missing facts are omitted. Release dates refer to
            the Steam listing; player counts are not copies sold. Your library playtime includes imported totals where
            available.
          </p>
        </details>
        {appid && !enabled && (
          <p className="daily-spotlight-source">
            {store || showPlayers
              ? 'Online refresh is off. Saved facts remain available.'
              : 'Enable online Steam facts above for release details and player snapshots.'}
          </p>
        )}
        <p className="daily-spotlight-status" role="status">
          {status}
        </p>
      </div>
    </section>
  );
}

export default function DailySpotlightCard({ library }) {
  const [day, setDay] = useState(() => getDateKey());
  const [game, setGame] = useState(null);
  useEffect(() => {
    const updateDay = () => setDay(getDateKey());
    const timer = window.setInterval(updateDay, 60000);
    window.addEventListener('focus', updateDay);
    document.addEventListener('visibilitychange', updateDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', updateDay);
      document.removeEventListener('visibilitychange', updateDay);
    };
  }, []);
  useEffect(() => {
    setGame(DailySpotlightService.selectGame(library));
  }, [library, day]);
  return game ? <SpotlightDetails key={DailySpotlightService.getKey(game)} game={game} day={day} /> : null;
}
