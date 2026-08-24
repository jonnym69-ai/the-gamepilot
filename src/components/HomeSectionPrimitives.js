import React from 'react';
import LazyImage from './LazyImage';
import { GamingIdentity } from '../GamingIdentity';

export function MiniProgressRing({ percent, size = 36, stroke = 4, color = '#8ab4f8' }) {
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

export function IdentityMatchBadge({ game, mood, genre }) {
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
            className="game-image home-grid-poster"
          />
        ) : (
          <div className="game-placeholder home-grid-poster">
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
    artwork = `https://cdn.cloudflare.steamstatic.com/steam/apps/${steamAppId}/library_600x900_2x.jpg`;
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
          <LazyImage src={artwork} alt={game.name} className="game-image home-grid-poster" />
        ) : (
          <div className="game-placeholder home-grid-poster">
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

export const formatSessionStyle = (bucket) => {
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
