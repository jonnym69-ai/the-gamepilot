import React from 'react';
import { Star, Clock, Trophy, Gamepad2, Calendar, Zap, CheckCircle2, Monitor, Tag, Sparkles } from 'lucide-react';
import { resolveGameArtwork } from '../services/GameArtworkService';
import { formatPlaytime } from '../utils/formatPlaytime';
import { ShareCardWatermark } from './ShareCardWatermark';
import ProfileService, { SOCIAL_PLATFORMS } from '../services/ProfileService';
import { GameLaunchTracker } from '../services/GameLaunchTracker';
import './GameShareCard.css';

export const GAME_SHARE_CARD_SIZE_PX = 1080;

const formatDate = (value) => {
  if (!value) return null;
  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  const ms = date.getTime();
  if (!Number.isFinite(ms) || ms === 0) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getGameId = (game = {}) => {
  return game?.id || game?.appid || game?.app_id || game?.steamAppId || game?.name || null;
};

const extractSocialHandle = (url = '', platform = '') => {
  try {
    const clean = url.trim();
    if (!clean) return '';
    const withProtocol = clean.startsWith('http') ? clean : `https://${clean}`;
    const parsed = new URL(withProtocol);
    const path = parsed.pathname.replace(/^\/+/, '').replace(/\/+$/, '');

    // Platform-specific handle extraction
    if (platform === 'youtube') {
      const handle = path.match(/^@([^/]+)/) || path.match(/^channel\/([^/]+)/) || path.match(/^c\/([^/]+)/);
      return handle ? handle[1] : path.split('/')[0];
    }
    if (platform === 'tiktok') {
      return path.startsWith('@') ? path : path.split('/')[0];
    }
    if (platform === 'discord') {
      return parsed.pathname.replace(/^\/+/, '') || parsed.hostname;
    }
    if (platform === 'bluesky') {
      return path.replace(/^profile\//, '');
    }
    if (platform === 'threads') {
      return path.startsWith('@') ? path : path.split('/')[0];
    }
    // Generic: drop leading slash and return first meaningful path segment
    return path.split('/')[0];
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  }
};

export function buildGameShareData(game = {}, gameStats = {}) {
  const safeGame = game || {};
  const safeStats = gameStats || {};

  const rating = safeGame.userRating || safeGame.rating || 0;
  const timePlayed = Number(safeGame.time_played || safeGame.playtime?.total || 0);
  const sessions = safeStats.totalSessions || safeGame.launch_count || safeGame.sessions || 0;

  // Compute longest session and first played from session history if available
  let longestSession = 0;
  let firstPlayedFromSessions = null;
  if (Array.isArray(safeStats.sessions) && safeStats.sessions.length > 0) {
    longestSession = Math.max(...safeStats.sessions.map((s) => s.playtimeMinutes || 0));
    const timestamps = safeStats.sessions
      .map((s) => s.timestamp?.getTime?.() || Number(s.timestamp) || 0)
      .filter((t) => t > 0);
    if (timestamps.length > 0) {
      firstPlayedFromSessions = Math.min(...timestamps);
    }
  }

  // GamePilot launch tracking (local sessions)
  const gameId = getGameId(safeGame);
  const launchData = gameId ? GameLaunchTracker.getGameLaunchData(gameId) : null;

  const avgSessionLength = safeStats.averageSessionLength || safeStats.avgSessionLength || launchData?.averageSessionLength || 0;

  const completionStatus = safeGame.completed
    ? 'Completed'
    : timePlayed > 0
      ? 'In Progress'
      : 'Backlog';

  const platform = safeGame.platform || safeGame.brandPlatform || (safeGame.launchSources?.[0]?.platform) || null;
  const genre = Array.isArray(safeGame.genres) && safeGame.genres.length > 0
    ? safeGame.genres[0]
    : (safeGame.genre || null);
  const mood = safeGame.mood || null;

  return {
    name: safeGame.name || 'Unknown Game',
    coverUrl: resolveGameArtwork(safeGame, { surface: 'portrait' }),
    rating,
    timePlayed,
    sessions,
    longestSession,
    avgSessionLength,
    lastPlayedGamePilot: safeStats.lastPlayed || launchData?.lastPlayed || null,
    firstPlayedGamePilot: launchData?.firstPlayed || firstPlayedFromSessions || null,
    lastPlayedSteam: safeGame.last_played || null,
    completionStatus,
    platform,
    genre,
    mood,
  };
}

export function buildGameShareCaption(data = {}) {
  const name = data.name || 'this game';
  const playtime = data.timePlayed ? formatPlaytime(data.timePlayed) : '0m';
  const sessions = data.sessions || 0;
  const rating = data.rating || 0;
  const avgSession = data.avgSessionLength ? formatPlaytime(data.avgSessionLength) : null;
  const completion = data.completionStatus;
  const genre = data.genre;
  const mood = data.mood;

  const templates = [
    `I've put ${playtime} into ${name} and I'm still having a blast 🎮`,
    `Just hit ${playtime} in ${name} — ${sessions} sessions and still going strong 🚀`,
    `${name} has me hooked: ${playtime} across ${sessions} sessions and counting 🔥`,
    `My Steam backlog is weeping but ${name} deserves every minute of ${playtime} 💀`,
    `Someone asked what I do for fun. I sent them this card. ${playtime} in ${name}. They understand now.`,
  ];

  if (rating > 0) {
    templates.push(`Rated ${name} a ${rating}/10 and I've already sunk ${playtime} into it ⭐`);
    templates.push(`${rating}/10 for ${name}. Would play again. Actually, I already did — ${sessions} times.`);
  }

  if (avgSession && sessions > 1) {
    templates.push(`My average ${name} session runs ${avgSession} — ${sessions} times and counting 🎯`);
    templates.push(`${sessions} sessions averaging ${avgSession} each in ${name}. My free time has a new boss.`);
  }

  if (genre && mood) {
    templates.push(`My ${mood} ${genre} pick right now: ${name}. ${playtime} well spent 🎮`);
  }

  if (completion === 'Completed') {
    const completedLines = [
      `Finally rolled credits on ${name} after ${playtime} and ${sessions} sessions. What a ride ✅`,
      `Beat ${name}. ${playtime}. ${sessions} sessions. No notes. ✅`,
      `${name}: completed. ${playtime} well spent. My backlog is furious but I'm at peace. ✅`,
    ];
    return completedLines[Math.floor(Math.random() * completedLines.length)];
  }

  if (sessions <= 1 && data.timePlayed > 0) {
    return `First session in ${name}: ${playtime} down. I can tell this one is going to stick 🎮`;
  }

  if (data.timePlayed > 6000) {
    const longLines = [
      `I may have a problem: ${playtime} in ${name} and I'm not even close to done 😅`,
      `${playtime} in ${name}. My therapist says acknowledging it is the first step. I say it's a feature.`,
      `When I said "just one more session" I meant it. ${sessions} times. ${playtime} in ${name}. 😤`,
    ];
    return longLines[Math.floor(Math.random() * longLines.length)];
  }

  return templates[Math.floor(Math.random() * templates.length)];
}

export function GameShareCard({ game = {}, gameStats = {}, socialLinks = null }) {
  const data = buildGameShareData(game, gameStats);
  const hasRating = data.rating > 0;
  const hasPlaytime = data.timePlayed > 0;
  const hasSessions = data.sessions > 0;
  const hasAvgSession = data.avgSessionLength > 0;
  const hasGenre = !!data.genre;
  const hasMood = !!data.mood;
  const hasPlatform = data.platform && data.platform !== 'Unknown';
  const lastPlayedGamePilot = formatDate(data.lastPlayedGamePilot);
  const firstPlayedGamePilot = formatDate(data.firstPlayedGamePilot);
  const lastPlayedSteam = formatDate(data.lastPlayedSteam);
  const linksToShow = socialLinks === null ? ProfileService.getEnabledSocialLinks() : socialLinks;
  const showSocials = linksToShow.length > 0;

  return (
    <div className="game-share-card">
      <div className="game-share-card-glow" aria-hidden="true" />
      <Gamepad2 className="game-share-watermark" size={320} aria-hidden="true" />

      <div className="game-share-card-header">
        <span className="game-share-card-brand">GAMEPILOT</span>
        <span className="game-share-card-tag">Game Card</span>
      </div>

      <div className="game-share-card-top">
        <div className="game-share-card-eyebrow">
          {hasRating ? (
            <div className="game-share-rating">
              {Array.from({ length: 10 }).map((_, i) => (
                <Star
                  key={i}
                  size={18}
                  className={i < Math.round(data.rating) ? 'filled' : 'empty'}
                />
              ))}
              <span>{data.rating}/10</span>
            </div>
          ) : (
            <span>Not rated yet</span>
          )}
        </div>

        <div className="game-share-card-title-row">
          <h2 className="game-share-card-title">{data.name}</h2>
          <div className="game-share-card-badges">
            {hasPlatform && (
              <span className="game-share-card-badge platform-badge">
                <Monitor size={14} />
                {data.platform}
              </span>
            )}
            <span className={`game-share-card-badge ${data.completionStatus === 'Completed' ? 'completed-badge' : ''}`}>
              {data.completionStatus === 'Completed' ? <CheckCircle2 size={14} /> : <Zap size={14} />}
              {data.completionStatus}
            </span>
          </div>
        </div>

        {(hasGenre || hasMood) && (
          <div className="game-share-card-sub-badges">
            {hasGenre && (
              <span className="game-share-card-badge genre-badge">
                <Tag size={14} />
                {data.genre}
              </span>
            )}
            {hasMood && (
              <span className="game-share-card-badge mood-badge">
                <Sparkles size={14} />
                {data.mood}
              </span>
            )}
          </div>
        )}

        <div className="game-share-card-strip">
          {hasPlaytime && (
            <div className="game-share-card-stat-pill">
              <Clock size={20} />
              <div>
                <strong>{formatPlaytime(data.timePlayed)}</strong>
                <span>total playtime</span>
              </div>
            </div>
          )}
          {hasSessions && (
            <div className="game-share-card-stat-pill">
              <Trophy size={20} />
              <div>
                <strong>{data.sessions}</strong>
                <span>{data.sessions === 1 ? 'session' : 'sessions'}</span>
              </div>
            </div>
          )}
          {data.longestSession > 0 && (
            <div className="game-share-card-stat-pill">
              <Star size={20} />
              <div>
                <strong>{formatPlaytime(data.longestSession)}</strong>
                <span>longest session</span>
              </div>
            </div>
          )}
          {hasAvgSession && (
            <div className="game-share-card-stat-pill">
              <Zap size={20} />
              <div>
                <strong>{formatPlaytime(data.avgSessionLength)}</strong>
                <span>avg session</span>
              </div>
            </div>
          )}
          {firstPlayedGamePilot && (
            <div className="game-share-card-stat-pill date-pill">
              <Calendar size={20} />
              <div>
                <strong>{firstPlayedGamePilot}</strong>
                <span>first played (GamePilot)</span>
              </div>
            </div>
          )}
          {lastPlayedGamePilot && (
            <div className="game-share-card-stat-pill date-pill">
              <Calendar size={20} />
              <div>
                <strong>{lastPlayedGamePilot}</strong>
                <span>last played (GamePilot)</span>
              </div>
            </div>
          )}
          {lastPlayedSteam && (
            <div className="game-share-card-stat-pill date-pill">
              <Calendar size={20} />
              <div>
                <strong>{lastPlayedSteam}</strong>
                <span>last played (Steam)</span>
              </div>
            </div>
          )}
        </div>

        {!hasPlaytime && !hasSessions && (
          <div className="game-share-card-empty">
            Waiting for first session data...
          </div>
        )}
      </div>

      {data.coverUrl && (
        <div
          className="game-share-card-cover-frame"
          style={{ backgroundImage: `url(${data.coverUrl})` }}
          aria-hidden="true"
        />
      )}

      {showSocials && (
        <div className="game-share-card-socials">
          {linksToShow.map((link) => {
            const platform = SOCIAL_PLATFORMS.find((p) => p.key === link.platform) || SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1];
            const handle = extractSocialHandle(link.url, platform.key);
            return (
              <div
                key={link.id}
                className="game-share-card-social-pill"
                style={{ '--platform-color': platform.color }}
                title={link.url}
              >
                <span className="social-indicator" />
                <span className="social-label">{platform.label}</span>
                <span className="social-handle">{handle}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="game-share-card-footer">
        <ShareCardWatermark />
      </div>
    </div>
  );
}

export default GameShareCard;
