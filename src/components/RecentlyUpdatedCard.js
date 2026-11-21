import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import SteamNewsService from '../services/SteamNewsService';
import './RecentlyUpdatedCard.css';

const MAX_CANDIDATES = 25;
const MAX_ROWS = 5;

const lastPlayedMs = (game) => {
  const raw = game?.last_played ?? game?.lastPlayed;
  if (!raw) return null;
  const numeric = typeof raw === 'number' || /^\d+(\.\d+)?$/.test(String(raw)) ? Number(raw) : null;
  const t = numeric !== null ? (numeric < 1e12 ? numeric * 1000 : numeric) : Date.parse(raw);
  return Number.isFinite(t) && t > 0 && t <= Date.now() ? t : null;
};

const steamAppId = (game) => {
  if (!game || String(game.platform || '').toLowerCase() !== 'steam') return null;
  const id = game.appid ?? game.steam_appid ?? game.appId;
  return id ? String(id) : null;
};

const openExternal = (url) => {
  if (!url) return;
  if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Steam's library "your games got updates" shelf, scoped to what you actually
 * play: recently played Steam games are warmed through SteamNewsService (6h
 * cache, throttled, opt-out respected), then filtered to posts newer than the
 * last play. Nothing renders when there's nothing new.
 */
export default function RecentlyUpdatedCard({ library = [] }) {
  const [updates, setUpdates] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const candidates = (Array.isArray(library) ? library : [])
      .map((game) => ({ game, appid: steamAppId(game), lastPlayed: lastPlayedMs(game) }))
      .filter(({ appid, lastPlayed }) => appid && lastPlayed)
      .sort((a, b) => b.lastPlayed - a.lastPlayed)
      .slice(0, MAX_CANDIDATES)
      .map(({ game }) => game);

    if (candidates.length === 0) {
      setLoaded(true);
      return undefined;
    }

    SteamNewsService.warmup(candidates)
      .then(() => {
        if (cancelled) return;
        const found = candidates
          .map((game) => ({ game, status: SteamNewsService.getUpdateStatus(game) }))
          .filter(({ status }) => status?.unread && status.latest?.dateMs)
          .sort((a, b) => b.status.latest.dateMs - a.status.latest.dateMs)
          .slice(0, MAX_ROWS);
        setUpdates(found);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [library]);

  if (!loaded || updates.length === 0) return null;

  return (
    <section className="recently-updated" aria-label="Recently updated games">
      <h3 className="recently-updated-title">
        <Bell size={15} aria-hidden="true" /> Updated since you last played
      </h3>
      <ul className="recently-updated-list">
        {updates.map(({ game, status }) => (
          <li key={game.name}>
            <button
              type="button"
              className="recently-updated-item"
              onClick={() => openExternal(status.latest.url)}
              title={status.latest.title}
            >
              <strong>{game.name}</strong>
              <span className="recently-updated-post">{status.latest.title}</span>
              <span className="recently-updated-meta">
                {status.isPatch ? 'Patch' : 'News'}
                {status.newerCount > 1 ? ` · ${status.newerCount} posts` : ''}
                {Number.isFinite(status.ageDays) ? ` · ${status.ageDays}d ago` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
