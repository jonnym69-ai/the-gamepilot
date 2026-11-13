import React, { useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import FirstReadService from '../services/FirstReadService';
import SessionRepository from '../services/SessionRepository';
import { formatPlaytime } from '../utils/formatPlaytime';
import './FirstReadCard.css';

const timeAgo = (ms) => {
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
};

// The day-one story: everything GamePilot already knows from imported
// playtime, clearly labelled as recorded on other launchers. Disappears on its
// own once enough real sessions exist for the live story surfaces.
export default function FirstReadCard({ library = [] }) {
  const read = useMemo(() => FirstReadService.getFirstRead(library, SessionRepository.getSessionHistory()), [library]);
  if (!read) return null;

  const { totalMinutes, topGames, platformCounts, latestPlayed, topGenres, ownedGames, sessionsToFullStory } = read;

  return (
    <section className="first-read" aria-label="Your history so far">
      <header className="first-read-head">
        <BookOpen size={15} aria-hidden="true" />
        <h3>Your history so far</h3>
        <span className="first-read-tag">recorded on other launchers</span>
      </header>

      <div className="first-read-stats">
        <div className="first-read-stat">
          <strong>{formatPlaytime(totalMinutes)}</strong>
          <span>across {ownedGames} games</span>
        </div>
        {platformCounts.slice(0, 3).map(([platform, count]) => (
          <div key={platform} className="first-read-stat">
            <strong>{count}</strong>
            <span>on {platform}</span>
          </div>
        ))}
        {latestPlayed && (
          <div className="first-read-stat">
            <strong>{latestPlayed.name}</strong>
            <span>last played {timeAgo(latestPlayed.lastPlayed)}</span>
          </div>
        )}
      </div>

      {topGames.length > 0 && (
        <div className="first-read-top">
          <div className="first-read-top-title">Your most-played elsewhere</div>
          <ol className="first-read-top-list">
            {topGames.map((g) => (
              <li key={g.name}>
                <span className="first-read-top-name">{g.name}</span>
                <span className="first-read-top-hours">{formatPlaytime(g.minutes)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {topGenres.length > 0 && (
        <div className="first-read-genres">
          {topGenres.map(([genre]) => (
            <span key={genre} className="first-read-genre">
              {genre}
            </span>
          ))}
        </div>
      )}

      <p className="first-read-foot">
        Play anything tonight and the real story starts recording — vitals, memoirs, and named eras fill in as tracked
        sessions build up{` (about ${sessionsToFullStory} to start)`}.
      </p>
    </section>
  );
}
