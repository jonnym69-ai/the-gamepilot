import React from 'react';
import LazyImage from './LazyImage';

export function HomeSection({ className = '', eyebrow, title, copy, compact = false, children }) {
  const headingClassName = `home-section-heading${compact ? ' compact' : ''}`;
  const sectionClassName = className ? ` ${className}` : '';

  return (
    <section className={`home-guided-section${sectionClassName}`}>
      <div className="home-section-shell">
        {(eyebrow || title || copy) && (
          <div className={headingClassName}>
            {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
            {title ? <h2 className="home-section-title">{title}</h2> : null}
            {copy ? <p className="home-section-copy">{copy}</p> : null}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export function RecommendationReasoning({ entry }) {
  const explanation = entry?.explanation;

  if (!explanation) {
    return null;
  }

  const confidence = Number(explanation.confidence || 0);
  const matchScore = Number(explanation.matchScore || 0);
  const reasons = Array.isArray(explanation.reasons) && explanation.reasons.length > 0
    ? explanation.reasons
    : ['Recommended for you'];

  return (
    <>
      <div className="recommendation-badge-container">
        <div className="confidence-badge" title={`${confidence}% confident match`}>
          {confidence}%
        </div>
        <div className="match-score" title={`${matchScore}/100 match score`}>
          ⭐ {matchScore}
        </div>
      </div>
      <div className="recommendation-reasoning">
        <details className="reasoning-details">
          <summary>Why this game?</summary>
          <div className="reasoning-content">
            {reasons.map((reason, index) => (
              <div key={`${entry?.game?.appid || entry?.game?.name || 'recommendation'}-${index}`} className="reasoning-item">
                <span className="reason-bullet">✓</span>
                <span className="reason-text">{reason}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </>
  );
}

export function CuratedShelfCard({
  title,
  subtitle,
  game,
  entry,
  artwork,
  placeholder,
  platformIcons,
  onLaunch,
  actionLabel = 'Launch',
  formatPlaytime,
  children
}) {
  if (!game) {
    return null;
  }

  return (
    <div className="game-card fade-in" style={{ maxWidth: '320px', width: '100%' }}>
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7, marginBottom: '4px' }}>
          {title}
        </div>
        <div style={{ fontSize: '0.95rem', opacity: 0.85 }}>
          {subtitle}
        </div>
      </div>
      <RecommendationReasoning entry={entry} />
      <div className="game-card-image-wrapper">
        {artwork ? (
          <LazyImage
            src={artwork}
            alt={game.name}
            placeholder={placeholder}
            className="game-image"
          />
        ) : (
          <div className="game-placeholder">
            <div className="platform-icon">
              {platformIcons[game.platform] || '❓'}
            </div>
          </div>
        )}
      </div>
      <h4 className="game-name">{game.name}</h4>
      <p className="game-platform">{game.platform}</p>
      <div className="game-info">
        <span className="game-genre">
          {game.genres && game.genres.length > 0 ? game.genres.filter((g) => g !== 'Unknown')[0] || 'Indie' : 'Indie'}
        </span>
        {formatPlaytime(game.time_played) && (
          <span className="game-playtime">
            {formatPlaytime(game.time_played)}
          </span>
        )}
      </div>
      {children}
      <div className="game-actions">
        <button onClick={onLaunch} className="game-launch-button primary">
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export function ContinuePlayingSection({
  game,
  entry,
  artwork,
  placeholder,
  platformIcons,
  formatLastPlayed,
  formatPlaytime,
  message,
  onLaunch,
  endSessionButton
}) {
  if (!game) {
    return null;
  }

  return (
    <div className="results-section">
      <div className="result-card">
        <h3 className="result-title">
          ▶️ Continue Playing
        </h3>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <div className="game-card" style={{ maxWidth: '280px', padding: '15px' }}>
            <div className="game-card-image-wrapper">
              {artwork ? (
                <LazyImage
                  src={artwork}
                  alt={game.name}
                  placeholder={placeholder}
                  className="game-image"
                />
              ) : (
                <div className="game-placeholder">
                  <div className="platform-icon">
                    {platformIcons[game.platform] || '❓'}
                  </div>
                </div>
              )}
            </div>
            <h4 className="game-name">
              {game.name}
            </h4>
            <p className="game-platform">
              {game.platform}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.6, margin: '4px 0' }}>
              Last played: {formatLastPlayed(game.last_played)}
            </p>
            <div className="game-info">
              <span className="game-genre">
                {game.genres && game.genres.length > 0 ? game.genres.filter((g) => g !== 'Unknown')[0] || 'Indie' : 'Indie'}
              </span>
              {formatPlaytime(game.time_played) && (
                <span className="game-playtime">
                  {formatPlaytime(game.time_played)}
                </span>
              )}
            </div>
            <RecommendationReasoning entry={entry} />
            <div className="game-actions">
              <button onClick={onLaunch} className="launch-button">
                🚀 Launch
              </button>
              {endSessionButton}
            </div>
            <div style={{ textAlign: 'center', marginTop: '15px' }}>
              <p style={{ color: 'var(--text)', opacity: 0.6, fontSize: '0.85rem', marginBottom: '10px' }}>
                {message || 'Pick up where you left off!'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MomentumSection({
  weeklyQuest,
  gamePilotPickEntries,
  gamePilotPicksResult,
  getGameCardClass,
  resolveGameArtwork,
  getGameArtworkPlaceholder,
  platformIcons,
  formatLastPlayed,
  formatPlaytime,
  onLaunchGame,
  trackRecommendationLaunch,
  renderEndSessionButton,
  handleWeeklyQuestPinToggle
}) {
  if (!weeklyQuest?.primaryQuest && (!Array.isArray(gamePilotPickEntries) || gamePilotPickEntries.length === 0)) {
    return null;
  }

  return (
    <HomeSection
      className="home-guided-section-secondary"
      eyebrow="Momentum"
      title="Keep the week moving"
      compact
    >
      <div className="retention-section">
        <div className="retention-grid">
          <div className="retention-panel weekly-quest-panel">
            <div className="retention-panel-header">
              <div>
                <p className="retention-eyebrow">Weekly Focus</p>
                <h3 className="retention-title">🧭 This Week&apos;s Quest</h3>
              </div>
              <div className="retention-summary-badge">
                {weeklyQuest.completedCount} of {weeklyQuest.totalCount || 0} done
              </div>
            </div>

            <p className="retention-panel-copy">
              Keep your momentum going with one featured goal and a few bonus targets.
            </p>

            <div className="retention-meta-strip">
              <span>{weeklyQuest.label || 'This Week'}</span>
              <span>{weeklyQuest.weeklyStats?.activeDays || 0} play days</span>
              <span>{weeklyQuest.weeklyStats?.playtimeHours || 0}h logged</span>
            </div>

            {weeklyQuest.primaryQuest ? (
              <div className={`weekly-quest-feature ${weeklyQuest.primaryQuest.completed ? 'is-complete' : ''}`}>
                <div className="weekly-quest-feature-header">
                  <span className="weekly-quest-rarity">{weeklyQuest.primaryQuest.rarity}</span>
                  <span className="weekly-quest-xp">+{weeklyQuest.primaryQuest.xpReward} XP</span>
                </div>
                <h4 className="weekly-quest-feature-title">
                  <span>{weeklyQuest.primaryQuest.icon}</span>
                  <span>{weeklyQuest.primaryQuest.name}</span>
                </h4>
                <p className="weekly-quest-feature-desc">{weeklyQuest.primaryQuest.desc}</p>
                <p className="weekly-quest-feature-requirement">{weeklyQuest.primaryQuest.requirementLabel}</p>
                <div className="weekly-quest-progress-meta">
                  <span>{weeklyQuest.primaryQuest.progressLabel}</span>
                  <span>
                    {weeklyQuest.primaryQuest.completed
                      ? (weeklyQuest.primaryQuest.permanentlyUnlocked ? 'Completed this week' : 'Unlocked now')
                      : weeklyQuest.primaryQuest.remainingLabel}
                  </span>
                </div>
                <div className="weekly-quest-progress-bar">
                  <span style={{ width: `${weeklyQuest.primaryQuest.progressPercent}%` }} />
                </div>
                <div className="weekly-quest-feature-actions">
                  <button
                    onClick={() => handleWeeklyQuestPinToggle(weeklyQuest.primaryQuest)}
                    className={`weekly-quest-pin-button ${weeklyQuest.primaryQuest.isPinned ? 'is-active' : ''}`}
                  >
                    {weeklyQuest.primaryQuest.isPinned ? 'Focused Goal' : 'Focus This'}
                  </button>
                  <span className={`weekly-quest-status ${weeklyQuest.primaryQuest.completed ? 'is-complete' : ''}`}>
                    {weeklyQuest.primaryQuest.completed ? 'Completed' : 'In Progress'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="retention-empty-state">
                Your weekly lineup will show up as soon as fresh goals are ready.
              </div>
            )}

            {weeklyQuest.quests.length > 0 && (
              <div className="weekly-quest-list">
                {weeklyQuest.quests.map((quest) => (
                  <div
                    key={quest.id}
                    className={`weekly-quest-card ${quest.isPinned ? 'is-pinned' : ''} ${quest.completed ? 'is-complete' : ''}`}
                  >
                    <div className="weekly-quest-card-top">
                      <div>
                        <p className="weekly-quest-card-metric">{quest.metricTitle}</p>
                        <h4 className="weekly-quest-card-title">
                          <span>{quest.icon}</span>
                          <span>{quest.name}</span>
                        </h4>
                      </div>
                      <button
                        onClick={() => handleWeeklyQuestPinToggle(quest)}
                        className={`weekly-quest-card-pin ${quest.isPinned ? 'is-active' : ''}`}
                      >
                        {quest.isPinned ? 'Focused' : 'Focus'}
                      </button>
                    </div>
                    <p className="weekly-quest-card-desc">{quest.desc}</p>
                    <p className="weekly-quest-card-requirement">{quest.requirementLabel}</p>
                    <div className="weekly-quest-progress-meta">
                      <span>{quest.progressLabel}</span>
                      <span>
                        {quest.completed
                          ? (quest.permanentlyUnlocked ? 'Completed this week' : 'Unlocked now')
                          : quest.remainingLabel}
                      </span>
                    </div>
                    <div className="weekly-quest-progress-bar">
                      <span style={{ width: `${quest.progressPercent}%` }} />
                    </div>
                    <div className="weekly-quest-card-footer">
                      <span className="weekly-quest-card-reward">+{quest.xpReward} XP</span>
                      <span className={`weekly-quest-status ${quest.completed ? 'is-complete' : ''}`}>
                        {quest.completed ? 'Complete' : 'In Progress'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {gamePilotPickEntries.length > 0 && (
            <div className="retention-panel retention-picks-panel">
              <div className="retention-panel-header">
                <div>
                  <p className="retention-eyebrow">Picked for You</p>
                  <h3 className="retention-title">✨ GamePilot Picks</h3>
                </div>
                <div className="retention-summary-badge">
                  {gamePilotPicksResult?.usedFallback ? 'Fresh mix' : 'Dialed in'}
                </div>
              </div>
              <p className="retention-panel-copy">
                {gamePilotPicksResult?.message || 'A short list tuned to what you have been into lately.'}
              </p>
              <div className="retention-picks-grid">
                {gamePilotPickEntries.map((entry, index) => {
                  const game = entry?.game;
                  if (!game) {
                    return null;
                  }

                  const gameArtwork = resolveGameArtwork(game, { surface: 'recommendation_card' });
                  const gamePlaceholder = getGameArtworkPlaceholder({ game, surface: 'recommendation_card' });

                  return (
                    <div key={game.appid || game.name || index} className={getGameCardClass(index)}>
                      <span className="retention-pick-label">Pick {index + 1}</span>
                      <RecommendationReasoning entry={entry} />
                      <div className="game-card-image-wrapper">
                        {gameArtwork ? (
                          <LazyImage
                            src={gameArtwork}
                            alt={game.name}
                            placeholder={gamePlaceholder}
                            className="game-image"
                          />
                        ) : (
                          <div className="game-placeholder">
                            <div className="platform-icon">
                              {platformIcons[game.platform] || '❓'}
                            </div>
                          </div>
                        )}
                      </div>
                      <h4 className="game-name">
                        {game.name}
                      </h4>
                      <p className="game-platform">
                        {game.platform}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.6, margin: '4px 0' }}>
                        Last played: {formatLastPlayed(game.last_played)}
                      </p>
                      <div className="game-info">
                        <span className="game-genre">
                          {game.genres && game.genres.length > 0 ? game.genres.filter((genre) => genre !== 'Unknown')[0] || 'Indie' : 'Indie'}
                        </span>
                        {formatPlaytime(game.time_played) && (
                          <span className="game-playtime">
                            {formatPlaytime(game.time_played)}
                          </span>
                        )}
                      </div>
                      <div className="game-actions">
                        <button
                          onClick={() => {
                            trackRecommendationLaunch(gamePilotPicksResult, game);
                            onLaunchGame(game);
                          }}
                          className="launch-button"
                        >
                          🚀 Launch
                        </button>
                        {renderEndSessionButton(game.name)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </HomeSection>
  );
}

export function MatchMyMoodSection({
  mood,
  selectedGenre,
  time,
  availableMoods,
  availableGenres,
  onSelectVibe,
  onMoodChange,
  onGenreChange,
  onTimeChange,
  onFindGamesForMood
}) {
  const quickVibes = [
    { id: 'stress_relief', label: 'Stress Relief', icon: '🧘', mood: 'Relaxed' },
    { id: 'feel_powerful', label: 'Feel Powerful', icon: '💪', mood: 'Competitive' },
    { id: 'mindless_fun', label: 'Mindless Fun', icon: '🎮', mood: 'Escapist' },
    { id: 'play_with_friends', label: 'Play With Friends', icon: '👥', mood: 'Social' },
    { id: 'get_creative', label: 'Get Creative', icon: '🎨', mood: 'Creative' },
    { id: 'epic_escape', label: 'Epic Escape', icon: '🏔️', mood: 'Escapist' },
    { id: 'test_my_skills', label: 'Test My Skills', icon: '🎯', mood: 'Tactical' },
    { id: 'nostalgia_trip', label: 'Nostalgia Trip', icon: '🕹️', mood: 'Relaxed' }
  ];

  return (
    <div className="match-my-mood-section">
      <h2 className="match-my-mood-title">
        🎭 Match My Mood
      </h2>
      <p className="match-my-mood-subtitle">
        Tell us how you're feeling and what you need right now
      </p>

      <div className="quick-vibes">
        <h3 className="quick-vibes-title">Quick Vibes</h3>
        <div className="vibe-buttons">
          {quickVibes.map((vibe) => (
            <button
              key={vibe.id}
              className={`vibe-button ${mood === vibe.mood ? 'active' : ''}`}
              onClick={() => onSelectVibe(vibe.mood)}
            >
              <span className="vibe-icon">{vibe.icon}</span>
              <span className="vibe-label">{vibe.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mood-divider">
        <span>Or select from options</span>
      </div>

      <div className="mood-filter-row">
        <select
          value={mood}
          onChange={(event) => onMoodChange(event.target.value)}
          className="mood-filter-select"
        >
          <option value="">How was your day?</option>
          {availableMoods.map((moodOption) => (
            <option key={moodOption} value={moodOption}>
              {moodOption}
            </option>
          ))}
        </select>

        <select
          value={selectedGenre}
          onChange={(event) => onGenreChange(event.target.value)}
          className="mood-filter-select"
        >
          <option value="">What do you want?</option>
          {availableGenres.map((genreOption) => (
            <option key={genreOption} value={genreOption}>
              {genreOption}
            </option>
          ))}
        </select>

        <select
          value={time}
          onChange={(event) => onTimeChange(event.target.value)}
          className="mood-filter-select"
        >
          <option value="">How much time do you have?</option>
          <option value="quick">⚡ Quick (15-30 min)</option>
          <option value="medium">⏰ Medium (1-2 hours)</option>
          <option value="long">🌙 Long (2+ hours)</option>
          <option value="weekend">📅 Weekend Session</option>
        </select>

        <button onClick={onFindGamesForMood} className="find-games-for-mood-btn">
          🔮 Find Games For My Mood
        </button>
      </div>
    </div>
  );
}

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
  onRediscover
}) {
  return (
    <div className="perfect-play-section">
      <p className="section-eyebrow">Curation Tools</p>
      <h2 className="perfect-play-title">
        🎯 Tune Your Next Pick
      </h2>
      <p className="perfect-play-subtitle">
        Use mood, genre, and time to narrow the shelf when you want something more specific than the curated picks above.
      </p>
      <div className="filter-grid">
        <div className="filter-card">
          <label className="filter-label">
            😌 Mood
          </label>
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
          <label className="filter-label">
            🎮 Genre
          </label>
          <select value={selectedGenre} onChange={(event) => onGenreChange(event.target.value)} className="filter-select">
            <option value="">Any Genre</option>
            {availableGenres.map((genreOption) => (
              <option key={genreOption} value={genreOption}>
                {genreOption}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-card">
          <label className="filter-label">
            ⏰ Time Available
          </label>
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

export function TopRatedSection({
  games,
  getGameCardClass,
  resolveGameArtwork,
  getGameArtworkPlaceholder,
  platformIcons,
  formatPlaytime,
  onLaunchGame,
  renderEndSessionButton
}) {
  if (!Array.isArray(games) || games.length === 0) {
    return null;
  }

  return (
    <div className="results-section">
      <div className="result-card">
        <h3 className="result-title">
          ⭐ Your Top Rated Games
        </h3>
        <p style={{ color: 'var(--text)', opacity: 0.7, marginBottom: '18px' }}>
          Your own favourites, kept separate from Perfect Play so recommendations can stay focused on discovery.
        </p>
        <div className="game-grid">
          {games.map((game, index) => {
            const gameArtwork = resolveGameArtwork(game, { surface: 'recommendation_card' });
            const gamePlaceholder = getGameArtworkPlaceholder({ game, surface: 'recommendation_card' });

            return (
              <div key={game.appid || game.name || `top-rated-${index}`} className={getGameCardClass(index)}>
                <div className="recommendation-badge-container">
                  <div className="match-score" title={`Rated ${game.userRating}/10`}>
                    ⭐ {game.userRating}/10
                  </div>
                </div>
                <div className="game-card-image-wrapper">
                  {gameArtwork ? (
                    <LazyImage
                      src={gameArtwork}
                      alt={game.name}
                      placeholder={gamePlaceholder}
                      className="game-image"
                    />
                  ) : (
                    <div className="game-placeholder">
                      <div className="platform-icon">
                        {platformIcons[game.platform] || '❓'}
                      </div>
                    </div>
                  )}
                </div>
                <h4 className="game-name">{game.name}</h4>
                <p className="game-platform">{game.platform}</p>
                <div className="game-info">
                  <span className="game-genre">
                    {game.genres && game.genres.length > 0 ? game.genres.filter((g) => g !== 'Unknown')[0] || 'Indie' : 'Indie'}
                  </span>
                  {formatPlaytime(game.time_played) && (
                    <span className="game-playtime">
                      {formatPlaytime(game.time_played)}
                    </span>
                  )}
                </div>
                <div className="game-actions">
                  <button onClick={() => onLaunchGame(game)} className="game-launch-button primary">
                    🎮 Launch
                  </button>
                  {renderEndSessionButton(game.name)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PerfectPlayResultSection({
  result,
  entries,
  getGameCardClass,
  resolveGameArtwork,
  getGameArtworkPlaceholder,
  platformIcons,
  formatPlaytime,
  handleTrackedLaunch,
  renderEndSessionButton,
  renderRecommendationFeedback,
  onClear
}) {
  if (!result) {
    return null;
  }

  return (
    <div className={`result-card ${result.error ? 'error' : ''}`}>
      <h3 className="result-title">
        🎯 Perfect Play Result
      </h3>
      {result.error ? (
        <p className="result-error">
          {result.error}
        </p>
      ) : (
        <div>
          <div className="game-grid">
            {entries.map((entry, index) => {
              const game = entry?.game;
              if (!game) {
                return null;
              }

              const gameArtwork = resolveGameArtwork(game, { surface: 'recommendation_card' });
              const gamePlaceholder = getGameArtworkPlaceholder({ game, surface: 'recommendation_card' });

              return (
                <div key={game.appid || `perfect-${index}`} className={getGameCardClass(index)}>
                  <RecommendationReasoning entry={entry} />
                  <div className="game-card-image-wrapper">
                    {gameArtwork ? (
                      <LazyImage
                        src={gameArtwork}
                        alt={game.name}
                        placeholder={gamePlaceholder}
                        className="game-image"
                      />
                    ) : (
                      <div className="game-placeholder">
                        <div className="platform-icon">
                          {platformIcons[game.platform] || '❓'}
                        </div>
                      </div>
                    )}
                  </div>
                  <h4 className="game-name">
                    {game.name}
                  </h4>
                  <p className="game-platform">
                    {game.platform}
                  </p>
                  <div className="game-info">
                    <span className="game-genre">
                      {game.genres && game.genres.length > 0 ? game.genres.filter((g) => g !== 'Unknown')[0] || 'Indie' : 'Indie'}
                    </span>
                    {formatPlaytime(game.time_played) && (
                      <span className="game-playtime">
                        {formatPlaytime(game.time_played)}
                      </span>
                    )}
                  </div>
                  <div className="game-actions">
                    <button
                      onClick={() => {
                        handleTrackedLaunch(game, {
                          feature: 'perfect_play',
                          result
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
  handleTrackedLaunch,
  renderEndSessionButton,
  renderRecommendationFeedback,
  onClear
}) {
  if (!result) {
    return null;
  }

  return (
    <div className={`result-card surprise ${result.error ? 'error' : ''}`}>
      <h3 className="result-title">
        🎲 Surprise Game
      </h3>
      {result.error ? (
        <p className="result-error">
          {result.error}
        </p>
      ) : game ? (
        <div style={{ textAlign: 'center' }}>
          <RecommendationReasoning entry={entry} />
          <div className="game-card-image-wrapper">
            {artwork ? (
              <LazyImage
                src={artwork}
                alt={game.name}
                placeholder={placeholder}
                className="game-image"
              />
            ) : (
              <div className="game-placeholder">
                <div className="platform-icon">
                  {platformIcons[game.platform] || '❓'}
                </div>
              </div>
            )}
          </div>
          <h4 className="game-name">
            {game.name}
          </h4>
          <p className="game-platform">
            {game.platform}
          </p>
          <p className="game-description">
            {result.message || 'A wildcard pick to shake up your rotation.'}
          </p>
          <div className="game-actions">
            <button
              onClick={() => {
                handleTrackedLaunch(game, {
                  feature: 'surprise',
                  result
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
  platformColors,
  platformIcons,
  handleTrackedLaunch,
  renderEndSessionButton,
  renderRecommendationFeedback,
  onClose
}) {
  if (!result) {
    return null;
  }

  return (
    <div className={`result-card rediscover ${result.error ? 'error' : ''}`}>
      <h3 className="result-title">
        🔄 Rediscover Games
      </h3>
      {result.error ? (
        <p className="result-error">
          {result.error}
        </p>
      ) : (
        <div>
          <div className="rediscover-header">
            <p className="rediscover-message">
              {result.message || 'A few overlooked favorites worth another run.'}
            </p>
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

              return (
                <div key={game.appid || game.name || index} className={getGameCardClass(index)}>
                  <RecommendationReasoning entry={entry} />
                  {game.iconUrl ? (
                    <LazyImage
                      src={game.iconUrl}
                      alt={game.name}
                      placeholder={`https://placehold.co/184x69/${platformColors[game.platform]?.replace('#', '') || '666666'}/fff?text=${encodeURIComponent(platformIcons[game.platform] || '❓')}`}
                      className="game-image"
                    />
                  ) : (
                    <div className="game-placeholder">
                      <div className="platform-icon">
                        {platformIcons[game.platform] || '❓'}
                      </div>
                    </div>
                  )}
                  <h4 className="game-name" style={{ fontSize: '0.9rem' }}>
                    {game.name}
                  </h4>
                  <p className="game-platform">
                    {game.platform}
                  </p>
                  <div className="game-actions">
                    <button
                      onClick={() => {
                        handleTrackedLaunch(game, {
                          feature: 'rediscover',
                          result
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
      {children}
    </div>
  );
}

export function GettingStartedSection({ onOpen }) {
  return (
    <div className="getting-started-section">
      <button
        onClick={onOpen}
        className="getting-started-button"
        title="Open the getting started guide and shortcut overview"
      >
        📖 Getting Started Guide
      </button>
    </div>
  );
}

export function HomeToolsContent({
  mood,
  selectedGenre,
  time,
  availableMoods,
  availableGenres,
  onSelectVibe,
  onMoodChange,
  onGenreChange,
  onTimeChange,
  onFindGamesForMood,
  onFindPerfectPlay,
  onSurpriseMe,
  onRediscover,
  perfectPlayResult,
  perfectPlayEntries,
  surpriseGameResult,
  surpriseGame,
  surpriseEntry,
  surpriseGameArtwork,
  surpriseGamePlaceholder,
  rediscoverGameResult,
  rediscoverEntries,
  topRatedGames,
  shouldShowLegacyTopRatedSection,
  getGameCardClass,
  resolveGameArtwork,
  getGameArtworkPlaceholder,
  platformColors,
  platformIcons,
  formatPlaytime,
  handleTrackedLaunch,
  renderEndSessionButton,
  renderRecommendationFeedback,
  onClearPerfectPlay,
  onClearSurprise,
  onCloseRediscover,
  onLaunchGame,
  onOpenGettingStarted
}) {
  return (
    <div className="home-content">
      <MatchMyMoodSection
        mood={mood}
        selectedGenre={selectedGenre}
        time={time}
        availableMoods={availableMoods}
        availableGenres={availableGenres}
        onSelectVibe={onSelectVibe}
        onMoodChange={onMoodChange}
        onGenreChange={onGenreChange}
        onTimeChange={onTimeChange}
        onFindGamesForMood={onFindGamesForMood}
      />

      <TuneYourNextPickSection
        mood={mood}
        selectedGenre={selectedGenre}
        time={time}
        availableMoods={availableMoods}
        availableGenres={availableGenres}
        onMoodChange={onMoodChange}
        onGenreChange={onGenreChange}
        onTimeChange={onTimeChange}
        onFindPerfectPlay={onFindPerfectPlay}
        onSurpriseMe={onSurpriseMe}
        onRediscover={onRediscover}
      />

      <RecommendationResultsSection hasResults={perfectPlayResult || surpriseGameResult || rediscoverGameResult}>
        <PerfectPlayResultSection
          result={perfectPlayResult}
          entries={perfectPlayEntries}
          getGameCardClass={getGameCardClass}
          resolveGameArtwork={resolveGameArtwork}
          getGameArtworkPlaceholder={getGameArtworkPlaceholder}
          platformIcons={platformIcons}
          formatPlaytime={formatPlaytime}
          handleTrackedLaunch={handleTrackedLaunch}
          renderEndSessionButton={renderEndSessionButton}
          renderRecommendationFeedback={renderRecommendationFeedback}
          onClear={onClearPerfectPlay}
        />
        <SurpriseGameResultSection
          result={surpriseGameResult}
          game={surpriseGame}
          entry={surpriseEntry}
          artwork={surpriseGameArtwork}
          placeholder={surpriseGamePlaceholder}
          platformIcons={platformIcons}
          handleTrackedLaunch={handleTrackedLaunch}
          renderEndSessionButton={renderEndSessionButton}
          renderRecommendationFeedback={renderRecommendationFeedback}
          onClear={onClearSurprise}
        />
        <RediscoverResultSection
          result={rediscoverGameResult}
          entries={rediscoverEntries}
          getGameCardClass={getGameCardClass}
          platformColors={platformColors}
          platformIcons={platformIcons}
          handleTrackedLaunch={handleTrackedLaunch}
          renderEndSessionButton={renderEndSessionButton}
          renderRecommendationFeedback={renderRecommendationFeedback}
          onClose={onCloseRediscover}
        />
      </RecommendationResultsSection>

      {topRatedGames.length > 0 && shouldShowLegacyTopRatedSection && (
        <TopRatedSection
          games={topRatedGames}
          getGameCardClass={getGameCardClass}
          resolveGameArtwork={resolveGameArtwork}
          getGameArtworkPlaceholder={getGameArtworkPlaceholder}
          platformIcons={platformIcons}
          formatPlaytime={formatPlaytime}
          onLaunchGame={onLaunchGame}
          renderEndSessionButton={renderEndSessionButton}
        />
      )}

      <GettingStartedSection onOpen={onOpenGettingStarted} />
    </div>
  );
}

export function HomeGuidedContent({
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
  platformIcons,
  onLaunchTonightPick,
  onLaunchContinuePlaying,
  onLaunchRediscover,
  onLaunchFavorite,
  formatLastPlayed,
  formatPlaytime,
  libraryStoryItems,
  shouldShowLegacyContinueSection,
  continuePlayingMessage,
  continuePlayingEndSessionButton,
  weeklyQuest,
  gamePilotPickEntries,
  gamePilotPicksResult,
  getGameCardClass,
  resolveGameArtwork,
  getGameArtworkPlaceholder,
  onLaunchGame,
  trackRecommendationLaunch,
  renderEndSessionButton,
  handleWeeklyQuestPinToggle
}) {
  return (
    <>
      <HomeSection
        eyebrow="Guided Right Now"
        title="Let GamePilot lead the first choice"
        copy="Start with the shelves and story below, then drop into the curation tools when you want to steer more precisely."
      >
        <LibraryTodaySection
          homeShelfCards={homeShelfCards}
          weeklyQuestSummary={weeklyQuestSummary}
          weeklyPlayDays={weeklyPlayDays}
          weeklyPlaytimeHours={weeklyPlaytimeHours}
          recentLibraryActivity={recentLibraryActivity}
          tonightPickGame={tonightPickGame}
          tonightPickEntry={tonightPickEntry}
          tonightPickArtwork={tonightPickArtwork}
          tonightPickPlaceholder={tonightPickPlaceholder}
          continuePlayingGame={continuePlayingGame}
          continuePlayingEntry={continuePlayingEntry}
          continuePlayingArtwork={continuePlayingArtwork}
          continuePlayingPlaceholder={continuePlayingPlaceholder}
          rediscoverShelfGame={rediscoverShelfGame}
          rediscoverShelfEntry={rediscoverShelfEntry}
          rediscoverShelfArtwork={rediscoverShelfArtwork}
          rediscoverShelfPlaceholder={rediscoverShelfPlaceholder}
          favoriteShelfGame={favoriteShelfGame}
          favoriteShelfArtwork={favoriteShelfArtwork}
          favoriteShelfPlaceholder={favoriteShelfPlaceholder}
          platformIcons={platformIcons}
          onLaunchTonightPick={onLaunchTonightPick}
          onLaunchContinuePlaying={onLaunchContinuePlaying}
          onLaunchRediscover={onLaunchRediscover}
          onLaunchFavorite={onLaunchFavorite}
          formatLastPlayed={formatLastPlayed}
          formatPlaytime={formatPlaytime}
        />

        <LibraryStoryCard items={libraryStoryItems} />
      </HomeSection>

      {shouldShowLegacyContinueSection && (
        <ContinuePlayingSection
          game={continuePlayingGame}
          entry={continuePlayingEntry}
          artwork={continuePlayingArtwork}
          placeholder={continuePlayingPlaceholder}
          platformIcons={platformIcons}
          formatLastPlayed={formatLastPlayed}
          formatPlaytime={formatPlaytime}
          message={continuePlayingMessage}
          onLaunch={onLaunchContinuePlaying}
          endSessionButton={continuePlayingEndSessionButton}
        />
      )}

      <MomentumSection
        weeklyQuest={weeklyQuest}
        gamePilotPickEntries={gamePilotPickEntries}
        gamePilotPicksResult={gamePilotPicksResult}
        getGameCardClass={getGameCardClass}
        resolveGameArtwork={resolveGameArtwork}
        getGameArtworkPlaceholder={getGameArtworkPlaceholder}
        platformIcons={platformIcons}
        formatLastPlayed={formatLastPlayed}
        formatPlaytime={formatPlaytime}
        onLaunchGame={onLaunchGame}
        trackRecommendationLaunch={trackRecommendationLaunch}
        renderEndSessionButton={renderEndSessionButton}
        handleWeeklyQuestPinToggle={handleWeeklyQuestPinToggle}
      />
    </>
  );
}

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
  platformIcons,
  onLaunchTonightPick,
  onLaunchContinuePlaying,
  onLaunchRediscover,
  onLaunchFavorite,
  formatLastPlayed,
  formatPlaytime
}) {
  if (!homeShelfCards) {
    return null;
  }

  return (
    <div className="results-section">
      <div className="result-card">
        <h3 className="result-title">
          📚 Your Library Today
        </h3>
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
        <div className="game-grid" style={{ alignItems: 'stretch' }}>
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
                  ⭐ {favoriteShelfGame.userRating}/10
                </div>
              </div>
            </CuratedShelfCard>
          )}
        </div>
      </div>
    </div>
  );
}

export function LibraryStoryCard({ items }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
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
