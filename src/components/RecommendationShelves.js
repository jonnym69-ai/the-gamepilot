import React from 'react';
import LazyImage from './LazyImage';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import { RecommendationReasoning, IdentityMatchBadge } from './HomeSectionPrimitives';

export function TuneYourNextPickSection({
  mood,
  selectedGenre,
  time,
  availableMoods,
  availableGenres,
  onMoodChange,
  onGenreChange,
  onTimeChange,
  onFindPerfectPlay,
  onSurpriseMe,
  onRediscover,
}) {
  return (
    <div className="perfect-play-section">
      <p className="section-eyebrow">Curation Tools</p>
      <h2 className="perfect-play-title">🎯 Tune Your Next Pick</h2>
      <p className="perfect-play-subtitle">
        Use mood, genre, and time to narrow the shelf when you want something more specific than the curated picks
        above.
      </p>
      <div className="filter-grid">
        <div className="filter-card">
          <label className="filter-label">😌 Mood</label>
          <select value={mood} onChange={(event) => onMoodChange(event.target.value)} className="filter-select">
            <option value="">Any Mood</option>
            {availableMoods.map((moodOption) => (
              <option key={moodOption} value={moodOption}>
                {moodOption}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-card">
          <label className="filter-label">🎮 Genre</label>
          <select
            value={selectedGenre}
            onChange={(event) => onGenreChange(event.target.value)}
            className="filter-select"
          >
            <option value="">Any Genre</option>
            {availableGenres.map((genreOption) => (
              <option key={genreOption} value={genreOption}>
                {genreOption}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-card">
          <label className="filter-label">⏰ Time Available</label>
          <select value={time} onChange={(event) => onTimeChange(event.target.value)} className="filter-select">
            <option value="">Any Time</option>
            <option value="quick">⚡ Quick (15-30 min)</option>
            <option value="medium">⏰ Medium (1-2 hours)</option>
            <option value="long">🌙 Long (2+ hours)</option>
            <option value="weekend">📅 Weekend Session</option>
          </select>
        </div>
      </div>

      <div className="action-buttons">
        <button onClick={onFindPerfectPlay} className="action-button primary">
          🎯 Find Perfect Play
        </button>
        <button onClick={onSurpriseMe} className="action-button accent">
          ? Surprise Me
        </button>
        <button onClick={onRediscover} className="action-button secondary">
          🔄 Rediscover Games
        </button>
      </div>
    </div>
  );
}

export function PerfectPlayResultSection({
  result,
  entries,
  getGameCardClass,
  platformIcons,
  formatPlaytime,
  handleTrackedLaunch,
  renderEndSessionButton,
  renderRecommendationFeedback,
  onClear,
}) {
  if (!result) {
    return null;
  }

  return (
    <div className={`result-card ${result.error ? 'error' : ''}`}>
      <h3 className="result-title">🎯 Perfect Play Result</h3>
      {result.error ? (
        <p className="result-error">{result.error}</p>
      ) : (
        <div>
          <div className="game-grid">
            {entries.map((entry, index) => {
              const game = entry?.game;
              if (!game) {
                return null;
              }

              const {
                artwork: gameArtwork,
                fallbackSrc: gameArtworkFallback,
                placeholder: gamePlaceholder,
              } = resolveGameArtworkBundle(game, { surface: 'portrait', fallbackSurface: 'hero' });

              const recMood = result?.tracking?.mood || entry?.explanation?.personaIdentity?.anchors?.[0] || null;
              const recGenre = result?.tracking?.genre || game?.genres?.[0] || null;

              return (
                <div key={game.appid || `perfect-${index}`} className={getGameCardClass(index)}>
                  <IdentityMatchBadge game={game} mood={recMood} genre={recGenre} />
                  <RecommendationReasoning entry={entry} />
                  <div className="game-card-image-wrapper">
                    {gameArtwork ? (
                      <LazyImage
                        src={gameArtwork}
                        fallbackSrc={gameArtworkFallback}
                        alt={game.name}
                        placeholder={gamePlaceholder}
                        className="game-image home-grid-poster"
                      />
                    ) : (
                      <div className="game-placeholder home-grid-poster">
                        <div className="platform-icon">{platformIcons[game.platform] || '❓'}</div>
                      </div>
                    )}
                  </div>
                  <h4 className="game-name">{game.name}</h4>
                  <p className="game-platform">{game.platform}</p>
                  <div className="game-info">
                    <span className="game-genre">
                      {game.genres && game.genres.length > 0
                        ? game.genres.filter((g) => g !== 'Unknown')[0] || 'Indie'
                        : 'Indie'}
                    </span>
                    {formatPlaytime(game.time_played) && (
                      <span className="game-playtime">{formatPlaytime(game.time_played)}</span>
                    )}
                  </div>
                  <div className="game-actions">
                    <button
                      onClick={() => {
                        handleTrackedLaunch(game, {
                          feature: 'perfect_play',
                          result,
                        });
                      }}
                      className="game-launch-button primary"
                    >
                      🎮 Launch
                    </button>
                    {renderEndSessionButton(game.name)}
                  </div>
                  {renderRecommendationFeedback(entry, result)}
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ color: 'var(--text)', opacity: 0.6, fontSize: '0.9rem', marginBottom: '15px' }}>
              {result.message || 'Hand-picked based on your current filters and play style.'}
            </p>
            <button onClick={onClear} className="clear-button">
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SurpriseGameResultSection({
  result,
  game,
  entry,
  artwork,
  placeholder,
  platformIcons,
  formatPlaytime,
  handleTrackedLaunch,
  renderEndSessionButton,
  renderRecommendationFeedback,
  onClear,
}) {
  if (!result) {
    return null;
  }

  return (
    <div className={`result-card surprise ${result.error ? 'error' : ''}`}>
      <h3 className="result-title">🎲 Surprise Game</h3>
      {result.error ? (
        <p className="result-error">{result.error}</p>
      ) : game ? (
        <div style={{ textAlign: 'center' }}>
          <IdentityMatchBadge
            game={game}
            mood={result?.tracking?.mood || game?.mood || null}
            genre={result?.tracking?.genre || game?.genres?.[0] || null}
          />
          <div className="game-card-image-wrapper">
            {artwork ? (
              <LazyImage src={artwork} alt={game.name} placeholder={placeholder} className="game-image" />
            ) : (
              <div className="game-placeholder">
                <div className="platform-icon">{platformIcons[game.platform] || '❓'}</div>
              </div>
            )}
          </div>
          <h4 className="game-name">{game.name}</h4>
          <p className="game-platform">{game.platform}</p>
          <div className="game-info">
            <span className="game-genre">
              {game.genres && game.genres.length > 0
                ? game.genres.filter((genre) => genre !== 'Unknown')[0] || 'Indie'
                : 'Indie'}
            </span>
            {formatPlaytime(game.time_played) && (
              <span className="game-playtime">{formatPlaytime(game.time_played)}</span>
            )}
          </div>
          <p className="game-description">{result.message || 'A wildcard pick to shake up your rotation.'}</p>
          <div className="game-actions">
            <button
              onClick={() => {
                handleTrackedLaunch(game, {
                  feature: 'surprise',
                  result,
                });
              }}
              className="game-launch-button accent"
            >
              🎮 Launch Game
            </button>
            {renderEndSessionButton(game.name)}
            <button onClick={onClear} className="clear-button">
              Clear
            </button>
          </div>
          {renderRecommendationFeedback(entry, result)}
        </div>
      ) : null}
    </div>
  );
}

export function RediscoverResultSection({
  result,
  entries,
  getGameCardClass,
  platformIcons,
  formatPlaytime,
  handleTrackedLaunch,
  renderEndSessionButton,
  renderRecommendationFeedback,
  onClose,
}) {
  if (!result) {
    return null;
  }

  return (
    <div className={`result-card rediscover ${result.error ? 'error' : ''}`}>
      <h3 className="result-title">🔄 Rediscover Games</h3>
      {result.error ? (
        <p className="result-error">{result.error}</p>
      ) : (
        <div>
          <div className="rediscover-header">
            <p className="rediscover-message">{result.message || 'A few overlooked favorites worth another run.'}</p>
            <button onClick={onClose} className="close-button">
              ✖️ Close
            </button>
          </div>
          <div className="game-grid">
            {entries.map((entry, index) => {
              const game = entry?.game;
              if (!game) {
                return null;
              }

              const {
                artwork: gameArtwork,
                fallbackSrc: gameArtworkFallback,
                placeholder: gamePlaceholder,
              } = resolveGameArtworkBundle(game, { surface: 'portrait', fallbackSurface: 'hero' });

              const recMood = result?.tracking?.mood || entry?.explanation?.personaIdentity?.anchors?.[0] || null;
              const recGenre = result?.tracking?.genre || game?.genres?.[0] || null;

              return (
                <div key={game.appid || game.name || index} className={getGameCardClass(index)}>
                  <IdentityMatchBadge game={game} mood={recMood} genre={recGenre} />
                  <RecommendationReasoning entry={entry} />
                  <div className="game-card-image-wrapper">
                    {gameArtwork ? (
                      <LazyImage
                        src={gameArtwork}
                        fallbackSrc={gameArtworkFallback}
                        alt={game.name}
                        placeholder={gamePlaceholder}
                        className="game-image home-grid-poster"
                      />
                    ) : (
                      <div className="game-placeholder home-grid-poster">
                        <div className="platform-icon">{platformIcons[game.platform] || '❓'}</div>
                      </div>
                    )}
                  </div>
                  <h4 className="game-name">{game.name}</h4>
                  <p className="game-platform">{game.platform}</p>
                  <div className="game-info">
                    <span className="game-genre">
                      {game.genres && game.genres.length > 0
                        ? game.genres.filter((genre) => genre !== 'Unknown')[0] || 'Indie'
                        : 'Indie'}
                    </span>
                    {formatPlaytime(game.time_played) && (
                      <span className="game-playtime">{formatPlaytime(game.time_played)}</span>
                    )}
                  </div>
                  <div className="game-actions">
                    <button
                      onClick={() => {
                        handleTrackedLaunch(game, {
                          feature: 'rediscover',
                          result,
                        });
                      }}
                      className="game-launch-button secondary"
                    >
                      🎮 Launch
                    </button>
                    {renderEndSessionButton(game.name)}
                  </div>
                  {renderRecommendationFeedback(entry, result)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function RecommendationResultsSection({ children, hasResults }) {
  if (!hasResults) {
    return null;
  }

  return (
    <div className="results-section">
      <div style={{ marginBottom: '16px' }}>
        <p className="section-eyebrow" style={{ marginBottom: '6px' }}>
          Recommendation Results
        </p>
        <h3 className="result-title" style={{ marginBottom: '6px' }}>
          Here&apos;s what GamePilot came back with
        </h3>
        <p style={{ color: 'var(--text)', opacity: 0.72, margin: 0 }}>
          Use these as short-term decision helpers, then clear them when you want the guided shelves to lead again.
        </p>
      </div>
      {children}
    </div>
  );
}
