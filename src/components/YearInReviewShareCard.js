import React from 'react';
import './YearInReviewShareCard.css';

/**
 * 1080x1080 square card optimised for social sharing.  Renders the year's
 * single biggest story — playtime + persona + a small stat strip — plus a
 * GamePilot wordmark so any share is also a free ad.
 *
 * Rendered hidden off-screen and rasterised on demand by YearInReview.
 */
export const SHARE_CARD_SIZE_PX = 1080;

const formatHours = (minutes) => {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m < 60) return `${m}m`;
  const h = m / 60;
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1).replace(/\.0$/, '')}h`;
};

export function YearInReviewShareCard({ snapshot, year, username }) {
  if (!snapshot) return null;

  const playtime = formatHours(snapshot?.summary?.playtimeMinutes);
  const sessions = snapshot?.summary?.sessions ?? 0;
  const activeDays = snapshot?.summary?.activeDays ?? 0;
  const avgSession = formatHours(snapshot?.summary?.avgSessionMinutes);
  const persona = snapshot?.persona?.identityLabel || 'Player';
  const topMood = snapshot?.persona?.dominantMood || '—';
  const topGenre = snapshot?.persona?.dominantGenre || '—';

  return (
    <div
      className="yir-share-card"
      style={{ width: SHARE_CARD_SIZE_PX, height: SHARE_CARD_SIZE_PX }}
    >
      <div className="yir-share-card-header">
        <span className="yir-share-card-brand">GAMEPILOT</span>
        <span className="yir-share-card-year">{year}</span>
      </div>

      <div className="yir-share-card-body">
        <span className="yir-share-card-eyebrow">{username || 'Pilot'} · Year in Review</span>

        <div className="yir-share-card-headline">
          <div className="yir-share-card-stat">
            <strong>{playtime}</strong>
            <span>played</span>
          </div>
        </div>

        <div className="yir-share-card-persona">
          <span>You played like a</span>
          <strong>{persona}</strong>
        </div>

        <div className="yir-share-card-strip">
          <div>
            <strong>{sessions}</strong>
            <span>sessions</span>
          </div>
          <div>
            <strong>{activeDays}</strong>
            <span>active days</span>
          </div>
          <div>
            <strong>{avgSession}</strong>
            <span>avg session</span>
          </div>
        </div>

        <div className="yir-share-card-tags">
          <div>
            <span>Top mood</span>
            <strong>{topMood}</strong>
          </div>
          <div>
            <span>Top genre</span>
            <strong>{topGenre}</strong>
          </div>
        </div>
      </div>

      <div className="yir-share-card-footer">
        <span>gamepilot · your local-first gaming companion</span>
      </div>
    </div>
  );
}

export default YearInReviewShareCard;
