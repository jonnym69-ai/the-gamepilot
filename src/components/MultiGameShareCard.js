import React from 'react';
import { Gamepad2, Clock, Trophy, Star, Zap, CheckCircle2, Monitor } from 'lucide-react';
import { resolveGameArtwork } from '../services/GameArtworkService';
import { formatPlaytime } from '../utils/formatPlaytime';
import { ShareCardWatermark } from './ShareCardWatermark';
import { GameLaunchTracker } from '../services/GameLaunchTracker';
import './MultiGameShareCard.css';

export const MULTI_GAME_SHARE_CARD_SIZE_PX = 1080;

const getGameId = (game = {}) => {
  return game?.id || game?.appid || game?.app_id || game?.steamAppId || game?.name || null;
};

export function buildMultiGameShareData(games = []) {
  const safeGames = Array.isArray(games) ? games.slice(0, 3).filter(Boolean) : [];

  return safeGames.map((game) => {
    const safeGame = game || {};
    const gameId = getGameId(safeGame);
    const launchData = gameId ? GameLaunchTracker.getGameLaunchData(gameId) : null;
    const timePlayed = Number(safeGame.time_played || safeGame.playtime?.total || 0);
    const sessions = safeGame.launch_count || safeGame.sessions || launchData?.totalLaunches || 0;
    const rating = safeGame.userRating || safeGame.rating || 0;
    const avgSessionLength = launchData?.averageSessionLength || 0;
    const completionStatus = safeGame.completed
      ? 'Completed'
      : timePlayed > 0
        ? 'In Progress'
        : 'Backlog';
    const platform = safeGame.platform || safeGame.brandPlatform || (safeGame.launchSources?.[0]?.platform) || null;
    const genre = Array.isArray(safeGame.genres) && safeGame.genres.length > 0
      ? safeGame.genres[0]
      : (safeGame.genre || null);

    return {
      name: safeGame.name || 'Unknown Game',
      coverUrl: resolveGameArtwork(safeGame, { surface: 'portrait' }),
      rating,
      timePlayed,
      sessions,
      avgSessionLength,
      completionStatus,
      platform,
      genre,
    };
  });
}

export function buildMultiGameShareCaption(data = []) {
  const safeData = Array.isArray(data) ? data : [];
  if (safeData.length === 0) return 'My GamePilot picks';

  const names = safeData.map((g) => g.name).join(' · ');
  const totalPlaytime = safeData.reduce((sum, g) => sum + (g.timePlayed || 0), 0);
  const totalSessions = safeData.reduce((sum, g) => sum + (g.sessions || 0), 0);
  const playtimeLabel = formatPlaytime(totalPlaytime);

  const templates = [
    `My top ${safeData.length} right now: ${names}. ${playtimeLabel} combined and counting 🎮`,
    `${safeData.length} games. ${playtimeLabel}. ${totalSessions} sessions. This is my personality now 🔥`,
    `Currently rotating between ${names}. ${playtimeLabel} says I have commitment issues 😅`,
    `Someone asked what I'm playing. I made a card. They regret asking. ${playtimeLabel} across ${safeData.length} games.`,
    `${names} — ${playtimeLabel} of my life I'll never get back. Worth every minute.`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

export function MultiGameShareCard({ games = [], username = 'Pilot', watermark = 'gamepilot' }) {
  const data = buildMultiGameShareData(games);
  const gameCount = data.length;

  if (gameCount === 0) return null;

  return (
    <div className="multi-game-share-card" style={{ width: MULTI_GAME_SHARE_CARD_SIZE_PX, height: MULTI_GAME_SHARE_CARD_SIZE_PX }}>
      <div className="multi-game-share-card-glow" aria-hidden="true" />
      <Gamepad2 className="multi-game-share-watermark" size={320} aria-hidden="true" />

      <div className="multi-game-share-card-header">
        <span className="multi-game-share-card-brand">GAMEPILOT</span>
        <span className="multi-game-share-card-tag">My Picks</span>
      </div>

      <div className="multi-game-share-card-eyebrow">
        {username || 'Pilot'} · {gameCount} game{gameCount !== 1 ? 's' : ''} on rotation
      </div>

      <div className={`multi-game-share-card-grid multi-game-count-${gameCount}`}>
        {data.map((game, index) => (
          <div key={index} className="multi-game-share-card-item">
            {game.coverUrl && (
              <div
                className="multi-game-share-card-cover"
                style={{ backgroundImage: `url(${game.coverUrl})` }}
                aria-hidden="true"
              />
            )}
            <div className="multi-game-share-card-info">
              <h3 className="multi-game-share-card-title">{game.name}</h3>
              <div className="multi-game-share-card-badges">
                {game.platform && game.platform !== 'Unknown' && (
                  <span className="multi-game-share-card-badge">
                    <Monitor size={12} />
                    {game.platform}
                  </span>
                )}
                <span className={`multi-game-share-card-badge ${game.completionStatus === 'Completed' ? 'completed' : ''}`}>
                  {game.completionStatus === 'Completed' ? <CheckCircle2 size={12} /> : <Zap size={12} />}
                  {game.completionStatus}
                </span>
              </div>
              <div className="multi-game-share-card-stats">
                {game.timePlayed > 0 && (
                  <div className="multi-game-share-card-stat">
                    <Clock size={16} />
                    <span>{formatPlaytime(game.timePlayed)}</span>
                  </div>
                )}
                {game.sessions > 0 && (
                  <div className="multi-game-share-card-stat">
                    <Trophy size={16} />
                    <span>{game.sessions} {game.sessions === 1 ? 'session' : 'sessions'}</span>
                  </div>
                )}
                {game.rating > 0 && (
                  <div className="multi-game-share-card-stat">
                    <Star size={16} />
                    <span>{game.rating}/10</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="multi-game-share-card-footer">
        <ShareCardWatermark
          watermark={watermark}
          context="multigame"
          ctaClassName="multi-game-share-card-cta"
          taglineClassName="multi-game-share-card-tagline"
        />
      </div>
    </div>
  );
}

export default MultiGameShareCard;
