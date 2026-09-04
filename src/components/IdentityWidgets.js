import React from 'react';
import { useNavigate } from 'react-router-dom';
import LazyImage from './LazyImage';
import { GamingIdentity } from '../GamingIdentity';
import GamingPersonaService from '../services/GamingPersonaService';
import CurrentEraService from '../services/CurrentEraService';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import { StartupPersonalizationService } from '../services/StartupPersonalizationService';
import { isGameUnplayed } from '../services/RecommendationEngine';
import { getBlendedPlaytimeMinutes } from '../services/gameClassification';
import { MiniProgressRing, formatSessionStyle } from './HomeSectionPrimitives';
import SessionRepository from '../services/SessionRepository';
import PeriodChampionService from '../services/PeriodChampionService';
import { LocalShareService } from '../services/LocalShareService';
import { ProfileService } from '../services/ProfileService';
import ShareMenu from './ShareMenu';
import ChampionShareCard from './ChampionShareCard';
import html2canvas from 'html2canvas';

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return 'recently';
  const ts = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  if (!ts || Number.isNaN(ts)) return 'recently';
  const diffMs = Math.max(0, Date.now() - ts);
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  const diffD = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffH < 1) return 'just now';
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD === 1) return 'yesterday';
  if (diffD < 7) return `${diffD}d ago`;
  return `${Math.floor(diffD / 7)}w ago`;
}

export function RecentSessionsSummary() {
  const data = React.useMemo(() => {
    try {
      const history = SessionRepository.getSessionHistory();
      if (!Array.isArray(history) || history.length === 0) return null;

      const sorted = [...history].sort((a, b) => {
        const aTs = new Date(a.endTime || a.timestamp || 0).getTime();
        const bTs = new Date(b.endTime || b.timestamp || 0).getTime();
        return bTs - aTs;
      });

      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

      const weekSessions = sorted.filter((s) => {
        const ts = new Date(s.endTime || s.timestamp || 0).getTime();
        return ts >= weekAgo;
      });

      const lastSession = sorted[0];
      const lastMinutes = Math.round(Number(
        lastSession?.playtimeMinutes ?? lastSession?.playtime ?? lastSession?.duration ?? lastSession?.minutes ?? 0
      ) || 0);
      const lastGame = lastSession?.gameName || lastSession?.gameId || null;
      const lastTs = lastSession?.endTime || lastSession?.timestamp || null;

      const longestThisWeek = weekSessions
        .map((s) => ({
          name: s.gameName || s.gameId || 'Unknown',
          minutes: Math.round(Number(s.playtimeMinutes ?? s.playtime ?? s.duration ?? s.minutes ?? 0) || 0),
          ts: s.endTime || s.timestamp || null,
        }))
        .filter((s) => s.minutes > 0)
        .sort((a, b) => b.minutes - a.minutes)[0] || null;

      const gamesThisWeek = [...new Set(
        weekSessions.map((s) => String(s.gameName || s.gameId || '').trim()).filter(Boolean)
      )];

      const totalWeekMinutes = weekSessions.reduce((sum, s) => {
        const m = Math.round(Number(s.playtimeMinutes ?? s.playtime ?? s.duration ?? s.minutes ?? 0) || 0);
        return sum + Math.max(0, m);
      }, 0);

      return {
        lastGame,
        lastDuration: formatDuration(lastMinutes),
        lastTimeAgo: formatRelativeTime(lastTs),
        longestThisWeek: longestThisWeek ? {
          name: longestThisWeek.name,
          duration: formatDuration(longestThisWeek.minutes),
        } : null,
        gamesThisWeek,
        totalWeekTime: formatDuration(totalWeekMinutes),
        weekSessionCount: weekSessions.length,
      };
    } catch {
      return null;
    }
  }, []);

  if (!data) return null;

  return (
    <div className="results-section">
      <div className="result-card recent-sessions-card">
        <h3 className="result-title">Recent Activity</h3>
        <div className="recent-sessions-body">
          {data.lastGame && (
            <div className="recent-session-item">
              <span className="recent-session-label">Last session</span>
              <span className="recent-session-value">{data.lastGame}</span>
              <span className="recent-session-meta">
                {data.lastDuration ? `${data.lastDuration} · ` : ''}{data.lastTimeAgo}
              </span>
            </div>
          )}
          {data.longestThisWeek && (
            <div className="recent-session-item">
              <span className="recent-session-label">Longest this week</span>
              <span className="recent-session-value">{data.longestThisWeek.name}</span>
              <span className="recent-session-meta">{data.longestThisWeek.duration}</span>
            </div>
          )}
          {data.gamesThisWeek.length > 0 && (
            <div className="recent-session-item">
              <span className="recent-session-label">This week</span>
              <span className="recent-session-value">
                {data.weekSessionCount} session{data.weekSessionCount !== 1 ? 's' : ''} · {data.totalWeekTime || '0m'}
              </span>
              <span className="recent-session-meta">
                {data.gamesThisWeek.length} game{data.gamesThisWeek.length !== 1 ? 's' : ''}: {data.gamesThisWeek.slice(0, 4).join(', ')}
                {data.gamesThisWeek.length > 4 ? ` +${data.gamesThisWeek.length - 4}` : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CurrentEraCard() {
  const era = React.useMemo(() => {
    try { return CurrentEraService.getCurrentEra(); } catch { return null; }
  }, []);

  if (!era || !era.snapshot || era.snapshot.totalMinutes <= 0) return null;

  const hours = (era.snapshot.totalMinutes / 60).toFixed(1);
  const topGames = (era.snapshot.topGames || []).slice(0, 3);
  const driftNotes = era.drift?.hasDrift ? era.drift.notes.slice(0, 2) : [];

  return (
    <div className="results-section">
      <div className="result-card identity-card">
        <div className="identity-title-row">
          <h3 className="result-title">Current Era</h3>
          <span className="identity-confidence-badge is-growing">Last {era.snapshot.windowDays} days</span>
        </div>
        <div className="identity-body">
          <div className="identity-header">
            <span className="identity-label">{era.name}</span>
            <p className="identity-description" style={{ opacity: 0.75, marginBottom: 6 }}>
              {era.flavor} · {hours}h across {era.snapshot.topGames.length} game{era.snapshot.topGames.length !== 1 ? 's' : ''}
              {era.snapshot.avgSessionLength > 0 ? ` · ~${era.snapshot.avgSessionLength}m sessions` : ''}
            </p>
          </div>
          {topGames.length > 0 && (
            <div className="identity-tags">
              {topGames.map((game) => (
                <span key={game.name} className="identity-tag">{game.name}</span>
              ))}
            </div>
          )}
          {driftNotes.length > 0 && (
            <p className="identity-provisional-note" style={{ marginTop: 8 }}>
              {driftNotes.join(' · ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function IdentitySnapshotCard({ persona }) {
  const navigate = useNavigate();
  // Default mode = adaptive current-rotation persona. This is the source of
  // truth for the identity surfaces; the all-time view lives on the Profile
  // page as an explicit opt-in.
  let publicIdentity = null;
  try {
    publicIdentity = GamingPersonaService.getPublicIdentity();
  } catch {
    publicIdentity = null;
  }

  const primary = publicIdentity?.primary || null;
  const roast = publicIdentity?.roast || null;
  const label = publicIdentity?.label || null;
  const tags = [
    ...(publicIdentity?.subTraits || []).map((trait) => trait.label)
  ].filter(Boolean);
  const confidence = publicIdentity?.confidence || 'none';
  const isEmpty = !label && tags.length === 0 && !roast;
  const canTune = !StartupPersonalizationService.hasCompletedOnboarding();
  const topGenre = publicIdentity?.dominantGenre || null;
  const topGameName = publicIdentity?.topGameName || null;
  const blendFactor = publicIdentity?.blendFactor ?? 0;
  const isWarmingUp = blendFactor < 1;

  const confidenceMeta = {
    high: { label: 'Locked in', className: 'is-confirmed' },
    medium: { label: 'Learning', className: 'is-growing' },
    low: { label: 'Early read', className: 'is-provisional' },
    confirmed: { label: 'Locked in', className: 'is-confirmed' },
    growing: { label: 'Learning', className: 'is-growing' },
    provisional: { label: 'Early read', className: 'is-provisional' }
  }[confidence] || null;

  const provisionalNote = isWarmingUp
    ? 'Warming up — blending your library with tracked play until ~10h of recent sessions. After that, this is purely your current rotation.'
    : canTune
      ? 'Still learning your tastes — a quick tune-up sharpens recommendations.'
      : null;

  if (isEmpty) {
    return (
      <div className="results-section">
        <div className="result-card identity-card">
          <h3 className="result-title">Your Gaming Persona</h3>
          <div className="identity-empty">
            <span className="identity-empty-icon">🧭</span>
            <p className="identity-empty-text">
              Scan your library and play a few sessions — GamePilot will build a roast-backed persona from how you actually play.
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
          <h3 className="result-title">Your Gaming Persona</h3>
          <span className="identity-confidence-badge is-growing">Current play</span>
          {confidenceMeta && (
            <span className={`identity-confidence-badge ${confidenceMeta.className}`}>{confidenceMeta.label}</span>
          )}
        </div>
        <div className="identity-body">
          <div className="identity-header">
            <span className="identity-label">{label || 'Gamer in progress'}</span>
            {primary?.description && (
              <p className="identity-description" style={{ opacity: 0.75, marginBottom: 6 }}>{primary.description}</p>
            )}
            {roast && (
              <p className="identity-description">{roast}</p>
            )}
            {topGameName && (
              <p className="identity-provisional-note" style={{ marginTop: 4 }}>
                Built from your play — currently led by {topGameName}.
              </p>
            )}
          </div>
          {provisionalNote && (
            <p className="identity-provisional-note">
              {provisionalNote}
              {canTune && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="identity-tune-link"
                    onClick={() => navigate('/profile')}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--button-primary-bg)',
                      font: 'inherit',
                      textDecoration: 'underline',
                      cursor: 'pointer'
                    }}
                  >
                    Tune recommendations →
                  </button>
                </>
              )}
            </p>
          )}
          <div className="identity-tags">
            {tags.map((tag, i) => (
              <span key={`tag-${i}`} className="identity-tag">{tag}</span>
            ))}
          </div>
          <div className="identity-metrics">
            {topGenre && (
              <div className="identity-metric">
                <span className="identity-metric-label">Top Genre</span>
                <span className="identity-metric-value">{topGenre}</span>
              </div>
            )}
            {persona?.preferredSessionBucket && (
              <div className="identity-metric">
                <span className="identity-metric-label">Typical Session</span>
                <span className="identity-metric-value">{formatSessionStyle(persona.preferredSessionBucket)}</span>
              </div>
            )}
            {persona?.peakPlayWindow && (
              <div className="identity-metric">
                <span className="identity-metric-label">Peak Window</span>
                <span className="identity-metric-value">{persona.peakPlayWindow}</span>
              </div>
            )}
            {persona?.avgSessionLength > 0 && (
              <div className="identity-metric">
                <span className="identity-metric-label">Avg Session</span>
                <span className="identity-metric-value">{persona.avgSessionLength}m</span>
              </div>
            )}
          </div>
          <p className="identity-provisional-note" style={{ marginTop: 8 }}>
            Reflects your current rotation.{' '}
            <button
              type="button"
              className="identity-tune-link"
              onClick={() => navigate('/profile')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--button-primary-bg)',
                font: 'inherit',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              View all-time persona →
            </button>
          </p>
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
  platformIcons,
  formatPlaytime,
  onLaunchGame,
  getGameCardClass
}) {
  try {
    const publicIdentity = React.useMemo(() => {
      // This shelf is the all-time showcase: the all-time persona roasting
      // your most-played games, so the voice and the picks agree.
      try { return GamingPersonaService.getPublicIdentity({ mode: 'all-time' }); } catch { return null; }
    }, []);
    if (!publicIdentity?.label) return null;

    // Top 3 most-played games of all time — no persona genre filter, so the
    // user's true heavyweights (e.g. a huge Rust playtime) always appear.
    const matchedGames = (Array.isArray(library) ? library : [])
      .filter((game) => game && getBlendedPlaytimeMinutes(game) > 0)
      .sort((a, b) => getBlendedPlaytimeMinutes(b) - getBlendedPlaytimeMinutes(a))
      .slice(0, 3);

    if (matchedGames.length === 0) return null;

    return (
      <div className="results-section">
        <div className="result-card because-you-are-card">
          <h3 className="result-title">
            {publicIdentity.becauseYouAre}
          </h3>
          <p style={{ color: 'var(--text)', opacity: 0.7, marginBottom: '16px', fontSize: '0.9rem' }}>
            {publicIdentity.roast
              ? `${publicIdentity.roast} These are your most-played games of all time.`
              : 'Your most-played games of all time.'}
          </p>
          <div className="game-grid">
            {matchedGames.map((game, index) => {
              const { artwork, fallbackSrc: artworkFallback, placeholder } = resolveGameArtworkBundle(game, { surface: 'portrait', fallbackSurface: 'hero' });
              return (
                <div key={game.appid || game.name || index} className={getGameCardClass ? getGameCardClass(index) : 'game-card'}>
                  <div className="game-card-image-wrapper">
                    {artwork ? (
                      <LazyImage src={artwork} fallbackSrc={artworkFallback} alt={game.name} placeholder={placeholder} className="game-image home-grid-poster" />
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
      freshGame = library.find((g) => isGameUnplayed(g)) || null;
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

// ---------------------------------------------------------------------------
// CurrentChampionCard — Home spotlight showing this week's most-played game,
// persona-voiced. Also surfaces last month's champion as a secondary tile.
// The live champion regenerates its roast each render; past champions are
// frozen time capsules (see PeriodChampionService).
// ---------------------------------------------------------------------------

const formatChampionHours = (minutes) => {
  if (!minutes || minutes <= 0) return '0h';
  const h = Math.round(minutes / 60);
  if (h >= 1000) return `${(h / 1000).toFixed(1)}k h`;
  return `${h}h`;
};

export function CurrentChampionCard({ library = [] }) {
  const navigate = useNavigate();
  const shareCardRef = React.useRef(null);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const username = ProfileService.getCurrentUsername();

  const weekChampion = React.useMemo(
    () => PeriodChampionService.getLiveChampion('week', { library }),
    [library]
  );
  const lastMonthChampion = React.useMemo(
    () => PeriodChampionService.getLastLockedChampion('month', { library }),
    [library]
  );

  if (!weekChampion) return null;

  const portrait = weekChampion.game?.portrait || null;
  const portraitFallback = weekChampion.game?.portraitFallback || null;
  const placeholder = weekChampion.game?.placeholder || null;
  const hours = formatChampionHours(weekChampion.minutes);
  const totalHours = formatChampionHours(weekChampion.totalPeriodMinutes);
  const personaLabel = weekChampion.personaSnapshot?.label || null;
  const roastLine = weekChampion.personaSnapshot?.roastLine || null;
  const runnerUp = weekChampion.runnerUp;
  const isLive = !weekChampion.lockedAt;

  return (
    <div className="results-section">
      <div className="result-card champion-card">
        <div className="champion-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 className="result-title">🏆 This Week's Champion</h3>
            {isLive && <span className="champion-live-badge">Live</span>}
          </div>
          <ShareMenu
            triggerLabel="Share Champion"
            imageAvailable
            disabled={isCapturing}
            onCopyText={async () => {
              const text = `🏆 My Weekly Champion on GamePilot: ${weekChampion.game?.name || 'Unknown'} (${hours} played)!\n"${roastLine || ''}"\nPowered by GamePilot`;
              return LocalShareService.copyTextToClipboard(text);
            }}
            onCopyImage={async () => {
              if (!shareCardRef.current) return false;
              setIsCapturing(true);
              try {
                const canvas = await html2canvas(shareCardRef.current, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
                const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
                if (!blob) return false;
                return LocalShareService.copyImageToClipboard(blob);
              } catch (err) {
                console.error(err);
                return false;
              } finally {
                setIsCapturing(false);
              }
            }}
            onSaveImage={async () => {
              if (!shareCardRef.current) return;
              setIsCapturing(true);
              try {
                const canvas = await html2canvas(shareCardRef.current, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
                const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
                if (!blob) return;
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `champion-${weekChampion.game?.name || 'game'}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              } catch (err) {
                console.error(err);
              } finally {
                setIsCapturing(false);
              }
            }}
            onShareText={async (channel) => {
              const text = `🏆 My Weekly Champion on GamePilot: ${weekChampion.game?.name || 'Unknown'} (${hours} played)!\n"${roastLine || ''}"\nPowered by GamePilot`;
              return LocalShareService.openShareIntent(channel, text);
            }}
          />
        </div>
        <div className="champion-card-body">
          <div className="champion-portrait">
            {portrait ? (
              <LazyImage
                src={portrait}
                alt={weekChampion.game.name}
                fallbackSrc={portraitFallback}
                placeholder={placeholder}
                gameName={weekChampion.game.name}
                platform={weekChampion.game.platform}
                className="champion-portrait-img"
              />
            ) : (
              <div className="champion-portrait-placeholder">
                {weekChampion.game.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
          </div>
          <div className="champion-info">
            <div className="champion-game-name">{weekChampion.game.name}</div>
            <div className="champion-hours-row">
              <span className="champion-hours">{hours}</span>
              <span className="champion-hours-label">this week</span>
              {weekChampion.totalPeriodMinutes > weekChampion.minutes && (
                <span className="champion-total">· {totalHours} total across {weekChampion.sessionCount} session{weekChampion.sessionCount === 1 ? '' : 's'}</span>
              )}
            </div>
            {personaLabel && (
              <div className="champion-persona-label">{personaLabel}</div>
            )}
            {roastLine && (
              <p className="champion-roast">{roastLine}</p>
            )}
            {runnerUp && (
              <div className="champion-runner-up">
                Runner-up: {runnerUp.name} ({formatChampionHours(runnerUp.minutes)})
              </div>
            )}
          </div>
        </div>
        {lastMonthChampion && (
          <div className="champion-card-secondary">
            {lastMonthChampion.game?.portrait && (
              <LazyImage
                src={lastMonthChampion.game.portrait}
                fallbackSrc={lastMonthChampion.game.portraitFallback}
                placeholder={lastMonthChampion.game.placeholder}
                gameName={lastMonthChampion.game.name}
                alt={`${lastMonthChampion.game.name} cover`}
                className="champion-secondary-cover"
              />
            )}
            <div className="champion-secondary-copy">
              <span className="champion-secondary-label">Last month's champion</span>
              <span className="champion-secondary-name">{lastMonthChampion.game.name}</span>
              <span className="champion-secondary-hours">{formatChampionHours(lastMonthChampion.minutes)}</span>
            </div>
          </div>
        )}
        <button
          type="button"
          className="champion-timeline-link"
          onClick={() => navigate('/timeline')}
          title="View your full champion history"
        >
          View full timeline →
        </button>

        {/* Hidden Render Target for Champion Share Image */}
        <div style={{ position: 'fixed', left: 0, top: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
          <div ref={shareCardRef}>
            <ChampionShareCard
              champion={weekChampion}
              periodType="week"
              username={username}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
