import React from 'react';
import LazyImage from './LazyImage';
import EmptyState from './EmptyState';
import { GamingIdentity } from '../GamingIdentity';

function MiniProgressRing({ percent, size = 36, stroke = 4, color = '#8ab4f8' }) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" stroke="rgba(255,255,255,0.12)" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none"
        strokeDasharray={circumference} strokeDashoffset={offset} stroke={color}
        strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
      />
      <text x="50%" y="50%" dy="0.3em" textAnchor="middle" fill="currentColor" fontSize={size * 0.35} fontWeight={700}>
        {percent}%
      </text>
    </svg>
  );
}

function IdentityMatchBadge({ game, mood, genre }) {
  try {
    const identity = React.useMemo(() => {
      try { return GamingIdentity.getProfile(); } catch { return null; }
    }, []);
    if (!identity?.identity) return null;

    const id = identity.identity;
    const gameGenres = Array.isArray(game?.genres) ? game.genres : [];
    const badges = [];

    if (mood && id.favoriteMood && mood === id.favoriteMood) {
      badges.push({ label: `🎭 ${id.favoriteMood}`, type: 'mood' });
    }
    if (genre && id.favoriteGenre && genre === id.favoriteGenre) {
      badges.push({ label: `🎯 ${id.favoriteGenre}`, type: 'genre' });
    } else if (id.favoriteGenre && gameGenres.includes(id.favoriteGenre)) {
      badges.push({ label: `🎯 ${id.favoriteGenre}`, type: 'genre' });
    }
    if (id.archetype) {
      badges.push({ label: `🏆 ${id.archetype}`, type: 'archetype' });
    }

    if (badges.length === 0) return null;

    return (
      <div className="identity-match-badges">
        {badges.map((b, i) => (
          <span key={i} className={`identity-match-badge ${b.type}`}>{b.label}</span>
        ))}
      </div>
    );
  } catch {
    return null;
  }
}

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
  const allReasons = Array.isArray(explanation.reasons) && explanation.reasons.length > 0
    ? explanation.reasons
    : ['Recommended for you'];
  const globalHook = explanation.globalHook || null;
  const gameSpecificHook = explanation.gameSpecificHook || null;
  const gameKey = entry?.game?.appid || entry?.game?.name || 'recommendation';
  // The main card face only shows the two-tier hooks. All other reasons live in the collapsible.
  const detailReasons = allReasons.filter((reason) => reason !== globalHook && reason !== gameSpecificHook);

  return (
    <>
      <div className="recommendation-badge-container">
        <div className="confidence-badge" title={`${confidence}% confident match · ${matchScore}/100 match score`}>
          {Math.round(confidence)}% match
        </div>
      </div>
      <div className="recommendation-reasoning">
        {globalHook && (
          <div className="reasoning-global-hook">{globalHook}</div>
        )}
        {gameSpecificHook && (
          <div className="reasoning-game-hook">{gameSpecificHook}</div>
        )}
        {detailReasons.length > 0 && (
          <details className="reasoning-details">
            <summary>
              <span className="reasoning-summary-label">💡 Why this game?</span>
              <span className="reasoning-summary-hint">{detailReasons.length} more reason{detailReasons.length === 1 ? '' : 's'}</span>
            </summary>
            <div className="reasoning-content">
              {detailReasons.map((reason, index) => (
                <div key={`${gameKey}-${index}`} className="reasoning-item">
                  <span className="reason-bullet">✓</span>
                  <span className="reason-text">{reason}</span>
                </div>
              ))}
            </div>
          </details>
        )}
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
  cycling = false,
  children
}) {
  if (!game) {
    return null;
  }

  return (
    <div className={`game-card curated-shelf-card fade-in ${cycling ? 'cycling' : ''}`} style={{ maxWidth: '400px', width: '100%' }}>
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

export function BuyShelfCard({
  entry,
  platformIcons = {},
  index = 0,
  count = 1,
  onNext,
  onPrev,
  title = 'Buy this next'
}) {
  if (!entry || !entry.game) {
    return null;
  }
  const game = entry.game;
  const meta = entry.meta || {};
  const item = meta.wishlistItem || {};
  const price = item.currentPrice;
  const hasCycle = count > 1 && typeof onNext === 'function' && typeof onPrev === 'function';

  const steamAppId = item.steamAppID || game.appid || null;
  const steamUrl = steamAppId
    ? `https://store.steampowered.com/app/${steamAppId}`
    : `https://store.steampowered.com/search/?term=${encodeURIComponent(game.name)}`;

  let artwork = null;
  if (steamAppId) {
    artwork = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/header.jpg`;
  } else if (item.thumb && /^https?:\/\//i.test(item.thumb)) {
    artwork = item.thumb;
  } else if (game.header_image && /^https?:\/\//i.test(game.header_image)) {
    artwork = game.header_image;
  }

  return (
    <div className="game-card curated-shelf-card buy-shelf-card fade-in" style={{ maxWidth: '400px', width: '100%' }}>
      <div style={{ marginBottom: '12px' }}>
        <div className="buy-shelf-header">
          <span>{title}</span>
        </div>
        <div style={{ fontSize: '0.95rem', opacity: 0.85 }}>
          The best value pick from your wishlist, matched to what you actually play.
        </div>
      </div>
      <RecommendationReasoning entry={entry} />
      <div className="game-card-image-wrapper">
        {artwork ? (
          <LazyImage src={artwork} alt={game.name} className="game-image" />
        ) : (
          <div className="game-placeholder">
            <div className="platform-icon">{platformIcons[game.platform] || '🛒'}</div>
          </div>
        )}
      </div>
      <h4 className="game-name">{game.name}</h4>
      <div className="game-info">
        {typeof meta.buyScore === 'number' && (
          <span className="game-genre">{meta.buyScore}% match</span>
        )}
        {price && (
          <span className="game-playtime">{price.priceFormatted || `$${price.price}`}</span>
        )}
      </div>
      {hasCycle && (
        <div className="buy-shelf-counter">
          <button onClick={onPrev} className="buy-shelf-arrow" aria-label="Previous wishlist pick">‹</button>
          <span className="buy-shelf-counter-text">{index + 1} / {count}</span>
          <button onClick={onNext} className="buy-shelf-arrow" aria-label="Next wishlist pick">›</button>
        </div>
      )}
      <div className="game-actions">
        <a href={steamUrl} target="_blank" rel="noopener noreferrer" className="game-launch-button primary">
          🛒 View on Steam
        </a>
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
    { id: 'feel_powerful', label: 'Feel Powerful', icon: '💪', mood: 'Social' },
    { id: 'mindless_fun', label: 'Mindless Fun', icon: '🎮', mood: 'Escapist' },
    { id: 'play_with_friends', label: 'Play With Friends', icon: '👥', mood: 'Social' },
    { id: 'get_creative', label: 'Get Creative', icon: '🎨', mood: 'Creative' },
    { id: 'epic_escape', label: 'Epic Escape', icon: '🏔️', mood: 'Escapist' },
    { id: 'test_my_skills', label: 'Test My Skills', icon: '🎯', mood: 'Focused' },
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
                    ★ {game.userRating}
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
          <IdentityMatchBadge game={game} mood={result?.tracking?.mood || game?.mood || null} genre={result?.tracking?.genre || game?.genres?.[0] || null} />
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
  resolveGameArtwork,
  getGameArtworkPlaceholder,
  platformIcons,
  formatPlaytime,
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

              const gameArtwork = resolveGameArtwork(game, { surface: 'recommendation_card' });
              const gamePlaceholder = getGameArtworkPlaceholder({ game, surface: 'recommendation_card' });

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
      <div style={{ marginBottom: '16px' }}>
        <p className="section-eyebrow" style={{ marginBottom: '6px' }}>Recommendation Results</p>
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
  libraryCount,
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
  onOpenGettingStarted,
}) {
  const hasLibrary = Number(libraryCount || 0) > 0;
  const hasMeaningfulLibrary = Number(libraryCount || 0) >= 3;

  return (
    <div className="home-content">
      {hasMeaningfulLibrary && (
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
      )}

      {!hasLibrary && (
        <EmptyState
          icon="🛰️"
          title="Scan your library to unlock smarter Home recommendations"
          description="Once GamePilot can see your installed games, this area becomes much more useful for mood matching, surprise picks, rediscovery, and guided recommendations."
          compact
          style={{ marginBottom: '20px' }}
        />
      )}

      {hasLibrary && !hasMeaningfulLibrary && (
        <EmptyState
          icon="🧪"
          title="Your Home tools are still calibrating"
          description="You already have a few games in the library, but GamePilot gets noticeably better once you scan more titles and build a little session history. For now, the core filters below are the most useful controls."
          compact
          style={{ marginBottom: '20px' }}
        />
      )}

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
          formatPlaytime={formatPlaytime}
          handleTrackedLaunch={handleTrackedLaunch}
          renderEndSessionButton={renderEndSessionButton}
          renderRecommendationFeedback={renderRecommendationFeedback}
          onClear={onClearSurprise}
        />
        <RediscoverResultSection
          result={rediscoverGameResult}
          entries={rediscoverEntries}
          getGameCardClass={getGameCardClass}
          resolveGameArtwork={resolveGameArtwork}
          getGameArtworkPlaceholder={getGameArtworkPlaceholder}
          platformIcons={platformIcons}
          formatPlaytime={formatPlaytime}
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
  libraryCount,
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
  onBuyPrev,
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
  const hasLibrary = Number(libraryCount || 0) > 0;

  return (
    <>
      <HomeSection
        eyebrow="Guided Right Now"
        title="Let GamePilot lead the first choice"
        copy="Start with the shelves and story below, then drop into the curation tools when you want to steer more precisely."
      >
        {hasLibrary ? (
          <>
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
              surpriseShelfGame={surpriseShelfGame}
              surpriseShelfEntry={surpriseShelfEntry}
              surpriseShelfArtwork={surpriseShelfArtwork}
              surpriseShelfPlaceholder={surpriseShelfPlaceholder}
              surpriseCycling={surpriseCycling}
              platformIcons={platformIcons}
              onLaunchTonightPick={onLaunchTonightPick}
              onLaunchContinuePlaying={onLaunchContinuePlaying}
              onLaunchRediscover={onLaunchRediscover}
              onLaunchFavorite={onLaunchFavorite}
              onLaunchSurpriseShelf={onLaunchSurpriseShelf}
              onViewSurpriseShelfStore={onViewSurpriseShelfStore}
              formatLastPlayed={formatLastPlayed}
              formatPlaytime={formatPlaytime}
              familiarityBias={familiarityBias}
              onFamiliarityChange={onFamiliarityChange}
              buyEntry={buyEntry}
              buyEntryIndex={buyEntryIndex}
              buyEntryCount={buyEntryCount}
              onBuyNext={onBuyNext}
              onBuyPrev={onBuyPrev}
            />

            <LibraryStoryCard items={libraryStoryItems} />
          </>
        ) : (
          <EmptyState
            icon="🎮"
            title="Your Home shelves will appear after your first scan"
            description="Scan your local games to unlock Tonight's Best Pick, Continue Playing, Rediscover, and the rest of the guided Home view."
          />
        )}
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

const formatSessionStyle = (bucket) => {
  switch (bucket) {
    case '0-30':
      return 'Quick play · under 30 min';
    case '30-60':
      return 'Steady · 30–60 min';
    case '60-120':
      return 'Deep session · 1–2 hrs';
    case '120+':
      return 'Marathon · 2 hrs+';
    default:
      return bucket;
  }
};

export function IdentitySnapshotCard({ persona }) {
  if (!persona) return null;
  const identity = persona.personaIdentity;
  const tags = persona.personaTags || [];
  const source = persona.source || (identity ? 'history' : 'empty');
  const confidence = persona.confidence || 'none';
  const isEmpty = source === 'empty' || (!identity && tags.length === 0);

  const confidenceMeta = {
    confirmed: { label: 'Confirmed', className: 'is-confirmed' },
    growing: { label: 'Learning', className: 'is-growing' },
    provisional: { label: 'Provisional', className: 'is-provisional' }
  }[confidence] || null;

  const provisionalNote = source === 'library'
    ? `Inferred from your ${persona.totalLibraryGames || ''} installed games — we'll sharpen this as you play.`.replace('  ', ' ')
    : source === 'seed'
      ? "Based on your onboarding picks — we'll refine this as you play."
      : null;

  if (isEmpty) {
    return (
      <div className="results-section">
        <div className="result-card identity-card">
          <h3 className="result-title">🎭 Your Gaming Persona</h3>
          <div className="identity-empty">
            <span className="identity-empty-icon">🧭</span>
            <p className="identity-empty-text">
              Scan your library to generate your starting persona — it sharpens every time you play.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-section">
      <div className="result-card identity-card">
        <div className="identity-title-row">
          <h3 className="result-title">🎭 Your Gaming Persona</h3>
          {confidenceMeta && (
            <span className={`identity-confidence-badge ${confidenceMeta.className}`}>{confidenceMeta.label}</span>
          )}
        </div>
        <div className="identity-body">
          {identity && (
            <div className="identity-header">
              <span className="identity-label">{identity.label}</span>
              <p className="identity-description">{identity.description}</p>
            </div>
          )}
          {provisionalNote && (
            <p className="identity-provisional-note">{provisionalNote}</p>
          )}
          <div className="identity-tags">
            {tags.map((tag, i) => (
              <span key={`tag-${i}`} className="identity-tag">{tag}</span>
            ))}
          </div>
          <div className="identity-metrics">
            {persona.dominantMood && (
              <div className="identity-metric">
                <span className="identity-metric-label">Dominant Mood</span>
                <span className="identity-metric-value">{persona.dominantMood}</span>
              </div>
            )}
            {persona.dominantGenre && (
              <div className="identity-metric">
                <span className="identity-metric-label">Top Genre</span>
                <span className="identity-metric-value">{persona.dominantGenre}</span>
              </div>
            )}
            {persona.preferredSessionBucket && (
              <div className="identity-metric">
                <span className="identity-metric-label">Typical Session</span>
                <span className="identity-metric-value">{formatSessionStyle(persona.preferredSessionBucket)}</span>
              </div>
            )}
            {persona.peakPlayWindow && (
              <div className="identity-metric">
                <span className="identity-metric-label">Peak Window</span>
                <span className="identity-metric-value">{persona.peakPlayWindow}</span>
              </div>
            )}
            {persona.avgSessionLength > 0 && (
              <div className="identity-metric">
                <span className="identity-metric-label">Avg Session</span>
                <span className="identity-metric-value">{persona.avgSessionLength}m</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WeeklyPlaySnapshot({ weeklyStats, streaks }) {
  const hasData = weeklyStats && (weeklyStats.totalHours > 0 || weeklyStats.sessions > 0 || weeklyStats.daysPlayed > 0);
  if (!hasData) return null;

  return (
    <div className="results-section">
      <div className="result-card weekly-play-card">
        <h3 className="result-title">📊 This Week</h3>
        <div className="weekly-play-grid">
          <div className="weekly-play-metric">
            <span className="weekly-play-number">{weeklyStats.totalHours}h</span>
            <span className="weekly-play-label">Played</span>
          </div>
          <div className="weekly-play-metric">
            <span className="weekly-play-number">{weeklyStats.sessions}</span>
            <span className="weekly-play-label">Sessions</span>
          </div>
          <div className="weekly-play-metric">
            <span className="weekly-play-number">{weeklyStats.daysPlayed}</span>
            <span className="weekly-play-label">Days</span>
          </div>
          <div className="weekly-play-metric">
            <span className="weekly-play-number">{weeklyStats.uniqueGames}</span>
            <span className="weekly-play-label">Games</span>
          </div>
          {streaks && streaks.current > 0 && (
            <div className="weekly-play-metric streak">
              <span className="weekly-play-number">{streaks.current}🔥</span>
              <span className="weekly-play-label">Streak</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HabitGoalsMiniCard({ goalProgress }) {
  const activeGoals = [
    ...(goalProgress?.weekly || []),
    ...(goalProgress?.monthly || [])
  ].filter((g) => !g.completed);

  if (activeGoals.length === 0) return null;

  const colorForPeriod = (period) =>
    period === 'week' ? '#8ab4f8' : '#c58af9';

  return (
    <div className="results-section">
      <div className="result-card habit-goals-card">
        <h3 className="result-title">🎯 Active Goals</h3>
        <div className="habit-goals-list">
          {activeGoals.slice(0, 4).map((goal) => (
            <div key={goal.id} className="habit-goal-row">
              <MiniProgressRing percent={goal.percent} color={colorForPeriod(goal.period)} />
              <div className="habit-goal-info">
                <span className="habit-goal-label">{goal.label}</span>
                <span className="habit-goal-sub">
                  {goal.current} / {goal.target} {goal.period === 'week' ? 'this week' : 'this month'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BecauseYouAreSection({
  library,
  resolveGameArtwork,
  getGameArtworkPlaceholder,
  platformIcons,
  formatPlaytime,
  onLaunchGame,
  getGameCardClass
}) {
  try {
    const identity = React.useMemo(() => {
      try { return GamingIdentity.getProfile(); } catch { return null; }
    }, []);
    if (!identity?.identity) return null;

    const id = identity.identity;
    if (!id.favoriteMood && !id.favoriteGenre && !id.archetype) return null;

    const matchedGames = library.filter((game) => {
      if (!game) return false;
      const genres = Array.isArray(game.genres) ? game.genres : [];
      const mood = game.mood || null;

      if (id.favoriteMood && mood === id.favoriteMood) return true;
      if (id.favoriteGenre && genres.includes(id.favoriteGenre)) return true;
      if (id.archetype) {
        const archetypeGenreMap = {
          'RPG Connoisseur': ['RPG'],
          'Strategy Sage': ['Strategy', 'Management'],
          'Shooter Specialist': ['Shooter', 'FPS', 'Action'],
          'Adventure Seeker': ['Adventure', 'Exploration'],
          'Puzzle Master': ['Puzzle', 'Logic'],
          'Indie Explorer': ['Indie'],
          'Horror Enthusiast': ['Horror'],
          'Sports Fanatic': ['Sports', 'Racing'],
          'Sandbox Architect': ['Simulation', 'Sandbox', 'Survival'],
          'MOBA Strategist': ['MOBA', 'Strategy'],
          'Fighting Veteran': ['Fighting'],
          'MMO Devotee': ['MMO', 'RPG'],
          'Narrative Lover': ['Adventure', 'RPG', 'Visual Novel'],
          'Completionist': ['RPG', 'Adventure', 'Platformer']
        };
        const affinities = archetypeGenreMap[id.archetype] || [];
        if (affinities.some((ag) => genres.includes(ag))) return true;
      }
      return false;
    }).slice(0, 2);

    if (matchedGames.length === 0) return null;

    const parts = [];
    if (id.archetype) parts.push(id.archetype);
    else if (id.favoriteGenre) parts.push(`${id.favoriteGenre} specialist`);
    else if (id.favoriteMood) parts.push(`${id.favoriteMood} seeker`);

    const identityLabel = parts.join(' ');

    return (
      <div className="results-section">
        <div className="result-card because-you-are-card">
          <h3 className="result-title">
            🎭 Because you&apos;re a {identityLabel}
          </h3>
          <p style={{ color: 'var(--text)', opacity: 0.7, marginBottom: '16px', fontSize: '0.9rem' }}>
            Games that fit your gaming identity.
          </p>
          <div className="game-grid">
            {matchedGames.map((game, index) => {
              const artwork = resolveGameArtwork(game, { surface: 'recommendation_card' });
              const placeholder = getGameArtworkPlaceholder({ game, surface: 'recommendation_card' });
              return (
                <div key={game.appid || game.name || index} className={getGameCardClass ? getGameCardClass(index) : 'game-card'}>
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
                      {game.genres && game.genres.length > 0 ? game.genres.filter((g) => g !== 'Unknown')[0] || 'Indie' : 'Indie'}
                    </span>
                    {formatPlaytime(game.time_played) && (
                      <span className="game-playtime">{formatPlaytime(game.time_played)}</span>
                    )}
                  </div>
                  <div className="game-actions">
                    <button onClick={() => onLaunchGame(game)} className="game-launch-button primary">
                      🎮 Launch
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  } catch {
    return null;
  }
}

export function FamiliarOrFreshNudge({ library, onLaunchGame, formatPlaytime, formatLastPlayed }) {
  if (!Array.isArray(library) || library.length === 0) return null;

  let familiarGame = null;
  let freshGame = null;

  try {
    const profiles = GamingIdentity.getFamiliarityProfiles();

    familiarGame = (profiles.familiarGames || [])
      .filter((g) => g.last_played)
      .sort((a, b) => new Date(b.last_played).getTime() - new Date(a.last_played).getTime())[0] || null;

    freshGame = (profiles.freshGames || [])
      .sort((a, b) => {
        const aTime = a.date_added ? new Date(a.date_added).getTime() : 0;
        const bTime = b.date_added ? new Date(b.date_added).getTime() : 0;
        return bTime - aTime;
      })[0] || null;

    if (!familiarGame && profiles.familiarGames.length > 0) {
      familiarGame = profiles.familiarGames
        .sort((a, b) => Number(b.time_played || 0) - Number(a.time_played || 0))[0] || null;
    }

    if (!freshGame) {
      freshGame = library.find((g) => !g.time_played || Number(g.time_played) === 0) || null;
    }
  } catch {
    return null;
  }

  if (!familiarGame && !freshGame) return null;

  return (
    <div className="familiar-fresh-nudge">
      <div className="familiar-fresh-header">
        <h3>What's it going to be?</h3>
        <p>Continue something you know, or start something new.</p>
      </div>
      <div className="familiar-fresh-cards">
        {familiarGame && (
          <div className="familiar-fresh-card familiar" onClick={() => onLaunchGame && onLaunchGame(familiarGame)}>
            <div className="familiar-fresh-label">Familiar</div>
            <div className="familiar-fresh-game-name">{familiarGame.name}</div>
            <div className="familiar-fresh-detail">
              {familiarGame.time_played > 0 && `${formatPlaytime ? formatPlaytime(familiarGame.time_played) : `${Math.round(familiarGame.time_played / 60)}h`} played`}
              {familiarGame.last_played && formatLastPlayed && ` · ${formatLastPlayed(familiarGame.last_played)}`}
            </div>
            <div className="familiar-fresh-action">Continue</div>
          </div>
        )}
        {freshGame && (
          <div className="familiar-fresh-card fresh" onClick={() => onLaunchGame && onLaunchGame(freshGame)}>
            <div className="familiar-fresh-label">Fresh</div>
            <div className="familiar-fresh-game-name">{freshGame.name}</div>
            <div className="familiar-fresh-detail">
              {freshGame.time_played > 0
                ? `${formatPlaytime ? formatPlaytime(freshGame.time_played) : `${Math.round(freshGame.time_played / 60)}h`} — barely touched`
                : 'Unplayed — waiting for you'}
            </div>
            <div className="familiar-fresh-action">Start fresh</div>
          </div>
        )}
      </div>
    </div>
  );
}
