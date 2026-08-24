import React from 'react';
import EmptyState from './EmptyState';
import { CuratedShelfCard, BuyShelfCard } from './HomeSectionPrimitives';

export function LibraryTodaySection({
  homeShelfCards,
  weeklyQuestSummary,
  weeklyPlayDays,
  weeklyPlaytimeHours,
  recentLibraryActivity,
  tonightPickGame,
  tonightPickEntry,
  tonightPickArtwork,
  tonightPickPlaceholder,
  continuePlayingGame,
  continuePlayingEntry,
  continuePlayingArtwork,
  continuePlayingPlaceholder,
  rediscoverShelfGame,
  rediscoverShelfEntry,
  rediscoverShelfArtwork,
  rediscoverShelfPlaceholder,
  favoriteShelfGame,
  favoriteShelfArtwork,
  favoriteShelfPlaceholder,
  surpriseShelfGame,
  surpriseShelfEntry,
  surpriseShelfArtwork,
  surpriseShelfPlaceholder,
  surpriseCycling,
  platformIcons,
  onLaunchTonightPick,
  onLaunchContinuePlaying,
  onLaunchRediscover,
  onLaunchFavorite,
  onLaunchSurpriseShelf,
  onViewSurpriseShelfStore,
  formatLastPlayed,
  formatPlaytime,
  familiarityBias,
  onFamiliarityChange,
  buyEntry,
  buyEntryIndex,
  buyEntryCount,
  onBuyNext,
  onBuyPrev
}) {
  if (!homeShelfCards) {
    return (
      <div className="results-section">
        <div className="result-card">
          <EmptyState
            icon="🧭"
            title="GamePilot is still assembling today's shelves"
            description="As soon as there is enough local activity, this area will surface a strong pick for tonight, a comeback game, something worth rediscovering, and a favourite to keep close."
            compact
          />
        </div>
      </div>
    );
  }

  return (
    <div className="results-section">
      <div className="result-card">
        <div className="library-today-header">
          <h3 className="result-title">
            📚 Your Library Today
          </h3>
          {onFamiliarityChange && (
            <div className="familiarity-toggle-buttons library-today-familiarity">
              <button
                className={`familiarity-btn ${familiarityBias === 'familiar' ? 'selected' : ''}`}
                onClick={() => onFamiliarityChange('familiar')}
                title="Lean toward games you already know and love"
              >
                Familiar
              </button>
              <button
                className={`familiarity-btn ${!familiarityBias ? 'selected' : ''}`}
                onClick={() => onFamiliarityChange(null)}
                title="A balanced mix"
              >
                Balanced
              </button>
              <button
                className={`familiarity-btn ${familiarityBias === 'fresh' ? 'selected' : ''}`}
                onClick={() => onFamiliarityChange('fresh')}
                title="Lean toward fresh, less-played games"
              >
                Fresh
              </button>
            </div>
          )}
        </div>
        <p style={{ color: 'var(--text)', opacity: 0.8, marginBottom: '10px' }}>
          Start with a few thoughtful shelves instead of a blank choice. One strong pick for tonight, one easy comeback, one game worth rediscovering, and one favourite to keep close.
        </p>
        <p style={{ color: 'var(--text)', opacity: 0.65, marginBottom: '20px', fontSize: '0.92rem' }}>
          {weeklyQuestSummary}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div className="home-reward-pill">
            <span>This week</span>
            <strong>{weeklyPlayDays} play day{weeklyPlayDays === 1 ? '' : 's'}</strong>
          </div>
          <div className="home-reward-pill">
            <span>Logged</span>
            <strong>{weeklyPlaytimeHours}h played</strong>
          </div>
          <div className="home-reward-pill">
            <span>Recent activity</span>
            <strong>{recentLibraryActivity} recent game{recentLibraryActivity === 1 ? '' : 's'}</strong>
          </div>
        </div>
        <div className="game-grid library-today-grid" style={{ alignItems: 'stretch' }}>
          {tonightPickGame && (
            <CuratedShelfCard
              title="Tonight's best pick"
              subtitle={tonightPickGame === continuePlayingGame ? 'A smart return based on what you were already enjoying.' : 'A curated fit based on your current filters, habits, and library.'}
              game={tonightPickGame}
              entry={tonightPickEntry}
              artwork={tonightPickArtwork}
              placeholder={tonightPickPlaceholder}
              platformIcons={platformIcons}
              onLaunch={onLaunchTonightPick}
              actionLabel="🎮 Play This"
              formatPlaytime={formatPlaytime}
            />
          )}
          {continuePlayingGame && continuePlayingGame !== tonightPickGame && (
            <CuratedShelfCard
              title="Continue where you left off"
              subtitle={`Last played ${formatLastPlayed(continuePlayingGame.last_played)}.`}
              game={continuePlayingGame}
              entry={continuePlayingEntry}
              artwork={continuePlayingArtwork}
              placeholder={continuePlayingPlaceholder}
              platformIcons={platformIcons}
              onLaunch={onLaunchContinuePlaying}
              actionLabel="🚀 Jump Back In"
              formatPlaytime={formatPlaytime}
            />
          )}
          {rediscoverShelfGame && (
            <CuratedShelfCard
              title="Worth rediscovering"
              subtitle="A game that deserves another run instead of disappearing into the backlog."
              game={rediscoverShelfGame}
              entry={rediscoverShelfEntry}
              artwork={rediscoverShelfArtwork}
              placeholder={rediscoverShelfPlaceholder}
              platformIcons={platformIcons}
              onLaunch={onLaunchRediscover}
              actionLabel="🔄 Revisit"
              formatPlaytime={formatPlaytime}
            />
          )}
          {favoriteShelfGame && (
            <CuratedShelfCard
              title="Keep close"
              subtitle="One of your top-rated favourites, surfaced so the library still feels personal, not just optimized."
              game={favoriteShelfGame}
              artwork={favoriteShelfArtwork}
              placeholder={favoriteShelfPlaceholder}
              platformIcons={platformIcons}
              onLaunch={onLaunchFavorite}
              actionLabel="⭐ Play Favourite"
              formatPlaytime={formatPlaytime}
            >
              <div className="recommendation-badge-container">
                <div className="match-score" title={`Rated ${favoriteShelfGame.userRating}/10`}>
                  ★ {favoriteShelfGame.userRating}
                </div>
              </div>
            </CuratedShelfCard>
          )}
          {buyEntry && (
            <BuyShelfCard
              entry={buyEntry}
              platformIcons={platformIcons}
              index={buyEntryIndex}
              count={buyEntryCount}
              onNext={onBuyNext}
              onPrev={onBuyPrev}
              title="Buy this next"
            />
          )}
          {surpriseShelfGame && (
            <CuratedShelfCard
              title="Surprise me"
              subtitle="A random pick from your wishlist so you don't always see the same top recommendation."
              game={surpriseShelfGame}
              entry={surpriseShelfEntry}
              artwork={surpriseShelfArtwork}
              placeholder={surpriseShelfPlaceholder}
              platformIcons={platformIcons}
              onLaunch={onLaunchSurpriseShelf}
              actionLabel="🎲 Surprise me"
              formatPlaytime={formatPlaytime}
              cycling={surpriseCycling}
            >
              {onViewSurpriseShelfStore && (
                <div className="game-actions" style={{ marginTop: '8px', marginBottom: '8px' }}>
                  <button onClick={onViewSurpriseShelfStore} className="game-launch-button secondary">
                    🛒 View on Steam
                  </button>
                </div>
              )}
            </CuratedShelfCard>
          )}
        </div>
      </div>
    </div>
  );
}

export function LibraryStoryCard({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="results-section">
        <div className="result-card library-story-card">
          <EmptyState
            icon="📝"
            title="Your library story will become clearer with more play history"
            description="Once you scan more games and log a few sessions, GamePilot will summarize what your library has been saying lately."
            compact
          />
        </div>
      </div>
    );
  }

  return (
    <div className="results-section">
      <div className="result-card library-story-card">
        <h3 className="result-title">
          📝 Your Library Story
        </h3>
        <p className="library-story-intro">
          A quick read on what your library has been saying lately.
        </p>
        <div className="library-story-grid">
          {items.map((storyItem, index) => (
            <div key={`library-story-${index}`} className="library-story-item">
              <span className="library-story-marker">✦</span>
              <span>{storyItem}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
