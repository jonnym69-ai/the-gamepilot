import React, { useEffect, useId, useState } from 'react';
import { Gift, ExternalLink, RefreshCw } from 'lucide-react';
import DailySpotlightCard from './DailySpotlightCard';
import DiscoverQuickPicks from './DiscoverQuickPicks';
import LazyImage from './LazyImage';
import { FreeGameRadar, getEpicOfferState } from '../services/FreeGameRadar';
import { openExternalUrl } from '../services/ElectronBridge';
import StorageService from '../services/StorageService';
import './DiscoverHighlights.css';

const EPIC_URL = 'https://store.epicgames.com/free-games';
const VISIBLE_KEY = 'discoverEpicRadarVisible';
const dateLabel = (value) =>
  new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

function EpicOffers({ onHide }) {
  const id = useId();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 60000);
    const refreshTimer = window.setInterval(() => setRefresh((value) => value + 1), 3600000);
    const onOnline = () => setRefresh((value) => value + 1);
    window.addEventListener('online', onOnline);
    return () => {
      window.clearInterval(clock);
      window.clearInterval(refreshTimer);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    FreeGameRadar.getEpicRadar({ forceRefresh: refresh > 0 })
      .then((value) => {
        if (active) setResult(value);
      })
      .catch(() => {
        if (active) setResult({ games: [], stale: true, error: 'Epic offers are temporarily unavailable.' });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  const openOffer = async (url) => {
    setLinkError('');
    try {
      await openExternalUrl(url);
    } catch {
      setLinkError('Could not open the store. Please try again.');
    }
  };
  const games = Array.isArray(result?.games) ? result.games : [];
  const available = games.filter((game) => getEpicOfferState(game, now) === 'available');
  const upcoming = games.filter((game) => getEpicOfferState(game, now) === 'upcoming');
  return (
    <section className="discover-epic-radar" aria-labelledby={`${id}-heading`}>
      <header className="discover-radar-header">
        <div>
          <p className="discover-kicker">
            <Gift size={15} aria-hidden="true" /> Something new, on Epic
          </p>
          <h2 id={`${id}-heading`}>Epic Free Games</h2>
          <p>Current giveaways and what's coming next.</p>
        </div>
        <div className="discover-radar-controls">
          <button
            type="button"
            onClick={() => setRefresh((value) => value + 1)}
            disabled={loading}
            aria-label="Refresh Epic offers"
          >
            <RefreshCw size={15} aria-hidden="true" /> Refresh
          </button>
          <button type="button" onClick={onHide}>
            Hide radar
          </button>
        </div>
      </header>
      <p className="discover-radar-status" role="status">
        {loading
          ? 'Checking Epic offers…'
          : result?.error ||
            (available.length
              ? 'Available during the listed offer periods.'
              : 'No current giveaways returned by Epic.')}
        {result?.stale && result?.checkedAt ? ' Showing saved listings; verify availability on Epic.' : ''}
      </p>
      <div className="discover-free-offers">
        {available.slice(0, 3).map((game) => (
          <article key={game.id} className="discover-free-offer">
            {game.image && <LazyImage src={game.image} alt={`${game.title} artwork`} />}
            <div>
              <span className="discover-offer-badge">{result?.stale ? 'Last seen free' : 'Free to keep'}</span>
              <h3>{game.title}</h3>
              <p className="discover-offer-description">
                {game.isMysteryGame ? 'Epic has not revealed this game yet.' : game.description}
              </p>
              <p className="discover-offer-date">
                Offer ends <time dateTime={game.endDate}>{dateLabel(game.endDate)}</time>
              </p>
              <button type="button" onClick={() => openOffer(game.url)} aria-label={`View ${game.title} on Epic`}>
                {result?.stale ? 'Check offer on Epic' : 'View free offer'}{' '}
                <ExternalLink size={14} aria-hidden="true" />
              </button>
            </div>
          </article>
        ))}
      </div>
      {upcoming.length > 0 && (
        <div className="discover-upcoming">
          <h3>Coming next</h3>
          {upcoming.slice(0, 3).map((game) => (
            <div key={game.id}>
              <strong>{game.title}</strong>
              <span>
                Starts <time dateTime={game.startDate}>{dateLabel(game.startDate)}</time>
              </span>
            </div>
          ))}
        </div>
      )}
      {linkError && <p role="alert">{linkError}</p>}
      <footer className="discover-radar-footer">
        <button type="button" onClick={() => openOffer(EPIC_URL)}>
          Browse Epic's free games <ExternalLink size={14} aria-hidden="true" />
        </button>
        <p>Source: Epic Games Store · US feed. Offers may vary by region; confirm price and claim on Epic.</p>
        <p>
          {result?.checkedAt ? `Last checked ${dateLabel(result.checkedAt)}. ` : ''}Refreshes hourly while visible. This
          public feed does not send your library or play history.
        </p>
      </footer>
    </section>
  );
}

export default function DiscoverHighlights({ library, onLaunchGame, activeSessions }) {
  const [visible, setVisible] = useState(() => StorageService.get(VISIBLE_KEY, true) !== false);
  const setRadarVisible = (value) => {
    StorageService.set(VISIBLE_KEY, value);
    setVisible(value);
  };
  return (
    <div className="discover-highlights">
      <DiscoverQuickPicks library={library} onLaunchGame={onLaunchGame} activeSessions={activeSessions} />
      <DailySpotlightCard library={library} rediscovery onLaunchGame={onLaunchGame} activeSessions={activeSessions} />
      {visible ? (
        <EpicOffers onHide={() => setRadarVisible(false)} />
      ) : (
        <section className="discover-epic-radar discover-empty">
          <h2>Epic Free Games</h2>
          <p>The radar is hidden. Show it to load Epic's public giveaways feed.</p>
          <button type="button" onClick={() => setRadarVisible(true)}>
            Show Epic radar
          </button>
        </section>
      )}
    </div>
  );
}
