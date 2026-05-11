import React, { useEffect, useState } from 'react';
import { Newspaper, ExternalLink, Loader2, Bell } from 'lucide-react';
import SteamNewsService from '../services/SteamNewsService';
import './PatchNewsPanel.css';

const formatRelative = (ms) => {
  if (!ms) return '';
  const diff = Date.now() - ms;
  if (diff < 0) return 'soon';
  const min = Math.round(diff / 60000);
  if (min < 60) return `${Math.max(1, min)}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.round(mo / 12)}y ago`;
};

const PatchNewsPanel = ({ game }) => {
  const [entry, setEntry] = useState(() => SteamNewsService.getCached(game));
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(() => SteamNewsService.isEnabled());

  useEffect(() => {
    setEntry(SteamNewsService.getCached(game));
    if (!game || !SteamNewsService.isEnabled()) return undefined;
    if (String(game.platform || '').toLowerCase() !== 'steam') return undefined;
    let cancelled = false;
    setLoading(true);
    SteamNewsService.getNews(game)
      .then((result) => { if (!cancelled) setEntry(result); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [game]);

  if (!game || String(game.platform || '').toLowerCase() !== 'steam') return null;

  const openExternal = (url) => {
    if (!url) return;
    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!enabled) {
    return (
      <div className="patch-news patch-news-empty">
        <div className="patch-news-header">
          <Newspaper size={16} aria-hidden="true" />
          <h3>Patch & News Radar</h3>
        </div>
        <p>Steam News lookups are off. Enable them to see recent patches and announcements per game.</p>
        <button
          type="button"
          className="patch-news-enable"
          onClick={() => { SteamNewsService.setEnabled(true); setEnabled(true); }}
        >
          Enable now
        </button>
      </div>
    );
  }

  if (loading && !entry) {
    return (
      <div className="patch-news patch-news-loading">
        <Loader2 size={14} className="patch-news-spin" aria-hidden="true" />
        <span>Loading recent news…</span>
      </div>
    );
  }

  if (!entry || !entry.found || entry.items.length === 0) {
    return null; // Quiet when nothing to show.
  }

  const status = SteamNewsService.getUpdateStatus(game);
  const items = entry.items.slice(0, 5);

  return (
    <div className="patch-news">
      <div className="patch-news-header">
        <Newspaper size={16} aria-hidden="true" />
        <h3>Patch & News Radar</h3>
        <span className="patch-news-source">via Steam News</span>
      </div>

      {status?.sinceLastPlayed && (
        <div className={`patch-news-since ${status.isPatch ? 'is-patch' : ''}`}>
          <Bell size={12} aria-hidden="true" />
          <span>
            <strong>{status.newerCount}</strong> {status.isPatch ? 'patch / update' : 'post'}
            {status.newerCount === 1 ? '' : 's'} since you last played
          </span>
        </div>
      )}

      <ul className="patch-news-list">
        {items.map((it) => (
          <li key={it.gid || it.url || it.title} className="patch-news-item">
            <button
              type="button"
              className="patch-news-item-button"
              onClick={() => openExternal(it.url)}
              title={it.preview || it.title}
            >
              <div className="patch-news-item-title">
                <span className="patch-news-item-title-text">{it.title}</span>
                <ExternalLink size={11} aria-hidden="true" />
              </div>
              <div className="patch-news-item-meta">
                {it.feedLabel && <span>{it.feedLabel}</span>}
                {it.feedLabel && <span className="patch-news-divider">·</span>}
                <span>{formatRelative(it.dateMs)}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PatchNewsPanel;
