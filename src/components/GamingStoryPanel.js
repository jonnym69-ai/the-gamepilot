import React from 'react';
import { BookOpen, Clock, Sparkles, TrendingUp } from 'lucide-react';
import { formatPlaytime } from '../utils/formatPlaytime';
import './GamingStoryPanel.css';

function GamingStoryPanel({ story }) {
  if (!story) {
    return (
      <div className="gaming-story-panel empty">
        <p className="gaming-story-panel-empty">
          Your gaming story will appear after your first library scan.
        </p>
      </div>
    );
  }

  const { title, subtitle, period, identityLabel, topGames, genreFingerprint, moodFingerprint, tasteClusters, narrative, totalHours } = story;
  const isIdentity = story.chapter === 'identity';
  const isPeriod = story.chapter === 'period';
  const isDigest = story.chapter === 'digest';
  const isQuiet = story.chapter === 'quiet' || story.isQuiet;
  const safeTopGames = Array.isArray(topGames) ? topGames : [];
  const safeGenreFingerprint = Array.isArray(genreFingerprint) ? genreFingerprint : [];
  const safeMoodFingerprint = Array.isArray(moodFingerprint) ? moodFingerprint : [];
  const safeTasteClusters = Array.isArray(tasteClusters) ? tasteClusters : [];
  const quietPeriodLabel = {
    daily: 'day',
    weekly: 'week',
    monthly: 'month',
    yearly: 'year'
  }[period] || 'period';

  return (
    <div className="gaming-story-panel">
      <div className="gaming-story-panel-covers">
        {safeTopGames.map((game, index) => (
          <div
            key={game.name}
            className="gaming-story-panel-cover"
            style={{
              backgroundImage: `url(${game.coverUrl})`,
              zIndex: safeTopGames.length - index
            }}
            aria-hidden="true"
          />
        ))}
        <div className="gaming-story-panel-gradient" aria-hidden="true" />
      </div>

      <div className="gaming-story-panel-content">
        <div className="gaming-story-panel-header">
          <div className="gaming-story-panel-badge">
            {isIdentity ? <TrendingUp size={14} /> : isDigest ? <BookOpen size={14} /> : isPeriod ? <Clock size={14} /> : <Sparkles size={14} />}
            {isQuiet ? `Quiet ${quietPeriodLabel}` : isIdentity ? 'Evolving identity' : isDigest ? `${period} digest` : isPeriod ? `${period} recap` : 'First chapter'}
          </div>
          {identityLabel && (
            <div className="gaming-story-panel-identity" title="Narrative voice">{identityLabel}</div>
          )}
        </div>

        <h3>{title}</h3>
        <p className="gaming-story-panel-subtitle">{subtitle}</p>

        <p
          className="gaming-story-panel-narrative"
          dangerouslySetInnerHTML={{
            __html: narrative.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          }}
        />

        <div className="gaming-story-panel-meta">
          <div className="gaming-story-panel-stat">
            <span className="gaming-story-panel-stat-value">{formatPlaytime(totalHours * 60)}</span>
            <span className="gaming-story-panel-stat-label">tracked</span>
          </div>
          {safeGenreFingerprint.length > 0 && (
            <div className="gaming-story-panel-genres">
              {safeGenreFingerprint.map((entry) => (
                <span key={entry.genre} className="gaming-story-panel-genre">
                  {entry.genre}
                </span>
              ))}
            </div>
          )}
        </div>

        {safeMoodFingerprint.length > 0 && (
          <div className="gaming-story-panel-moods">
            {safeMoodFingerprint.map((entry) => (
              <span key={entry.mood} className="gaming-story-panel-mood">
                {entry.mood}
              </span>
            ))}
          </div>
        )}

        {safeTasteClusters.length > 0 && (
          <div className="gaming-story-panel-clusters">
            <span className="gaming-story-panel-clusters-label">
              <BookOpen size={14} />
              Taste clusters
            </span>
            {safeTasteClusters.map((cluster) => (
              <span key={cluster?.label || cluster} className="gaming-story-panel-cluster">
                {cluster?.label || cluster}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GamingStoryPanel;
