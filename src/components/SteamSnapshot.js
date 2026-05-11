import React, { useEffect, useState } from 'react';
import { ThumbsUp, Trophy, ExternalLink, Loader2 } from 'lucide-react';
import SteamPublicService from '../services/SteamPublicService';
import './SteamSnapshot.css';

const reviewTone = (positivePct) => {
  if (positivePct == null) return 'meh';
  if (positivePct >= 80) return 'good';
  if (positivePct >= 60) return 'ok';
  if (positivePct >= 40) return 'meh';
  return 'bad';
};

const formatCount = (n) => {
  if (!n && n !== 0) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
};

const SteamSnapshot = ({ game }) => {
  const [entry, setEntry] = useState(() => SteamPublicService.getCached(game));
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(() => SteamPublicService.isEnabled());

  useEffect(() => {
    setEntry(SteamPublicService.getCached(game));
    if (!game || !SteamPublicService.isEnabled()) return undefined;
    if (String(game.platform || '').toLowerCase() !== 'steam') return undefined;
    let cancelled = false;
    setLoading(true);
    SteamPublicService.getSnapshot(game)
      .then((result) => { if (!cancelled) setEntry(result); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [game]);

  // Hide entirely for non-Steam games — nothing to show.
  if (!game || String(game.platform || '').toLowerCase() !== 'steam') return null;

  const openExternal = (url) => {
    if (!url) return;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!enabled) {
    return (
      <div className="steam-snapshot steam-snapshot-empty">
        <div className="steam-snapshot-header">
          <ThumbsUp size={16} aria-hidden="true" />
          <h3>Steam Snapshot</h3>
        </div>
        <p>Steam public-data lookups are off. Enable them to see review summaries and global achievement rarity per game.</p>
        <button
          type="button"
          className="steam-snapshot-enable"
          onClick={() => { SteamPublicService.setEnabled(true); setEnabled(true); }}
        >
          Enable now
        </button>
      </div>
    );
  }

  if (loading && !entry) {
    return (
      <div className="steam-snapshot steam-snapshot-loading">
        <Loader2 size={14} className="steam-snapshot-spin" aria-hidden="true" />
        <span>Loading Steam Snapshot…</span>
      </div>
    );
  }

  if (!entry || !entry.found) {
    return null; // Nothing meaningful to show; stay quiet.
  }

  const { reviews, achievements, communityUrl, achievementsUrl } = entry;
  const tone = reviews ? reviewTone(reviews.positivePct) : 'meh';

  return (
    <div className="steam-snapshot">
      <div className="steam-snapshot-header">
        <ThumbsUp size={16} aria-hidden="true" />
        <h3>Steam Snapshot</h3>
        <span className="steam-snapshot-source">via store.steampowered.com</span>
      </div>

      {reviews && (
        <div className={`steam-snapshot-reviews tone-${tone}`}>
          <div className="steam-snapshot-reviews-line">
            <strong>{reviews.label || 'Reviewed'}</strong>
            <span className="steam-snapshot-pct">{reviews.positivePct}% positive</span>
          </div>
          <div className="steam-snapshot-reviews-meta">
            {formatCount(reviews.totalReviews)} reviews
            <span className="steam-snapshot-divider">·</span>
            {formatCount(reviews.totalPositive)} up
            <span className="steam-snapshot-divider">·</span>
            {formatCount(reviews.totalNegative)} down
          </div>
        </div>
      )}

      {achievements && (
        <div className="steam-snapshot-achievements">
          <Trophy size={14} aria-hidden="true" />
          <div>
            <div className="steam-snapshot-ach-line">
              <strong>{achievements.total}</strong> achievements
              <span className="steam-snapshot-divider">·</span>
              avg <strong>{achievements.averagePercent}%</strong> unlock rate
            </div>
            {achievements.rarestPercent != null && (
              <div className="steam-snapshot-ach-meta">
                Rarest: only <strong>{achievements.rarestPercent}%</strong> of players have it
              </div>
            )}
          </div>
        </div>
      )}

      <div className="steam-snapshot-links">
        {achievementsUrl && (
          <button type="button" onClick={() => openExternal(achievementsUrl)}>
            <ExternalLink size={11} aria-hidden="true" /> Achievement leaderboard
          </button>
        )}
        {communityUrl && (
          <button type="button" onClick={() => openExternal(communityUrl)}>
            <ExternalLink size={11} aria-hidden="true" /> Community hub
          </button>
        )}
      </div>
    </div>
  );
};

export default SteamSnapshot;
