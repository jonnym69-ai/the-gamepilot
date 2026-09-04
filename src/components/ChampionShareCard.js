import React from 'react';
import { Trophy, Crown, Flame, Clock, Gamepad2, Sparkles } from 'lucide-react';
import { formatPlaytime } from '../utils/formatPlaytime';
import { resolveGameArtwork } from '../services/GameArtworkService';
import { ShareCardWatermark } from './ShareCardWatermark';
import './ChampionShareCard.css';

export function ChampionShareCard({
  champion = null,
  periodType = 'week',
  username = 'Player',
  showCover = true,
  watermark = 'gamepilot'
}) {
  if (!champion) return null;

  const game = champion.game || {};
  const gameName = game.name || champion.gameName || 'Mystery Champion';
  const minutes = champion.minutes || 0;
  const totalMinutes = champion.totalPeriodMinutes || minutes;
  const sharePercent = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 100;
  
  const personaLabel = champion.personaSnapshot?.label || 'Champion Pilot';
  const roastLine = champion.personaSnapshot?.roastLine || champion.speech?.quote || 'Dominated the session playlist with pure dedication.';
  
  const coverUrl = showCover && game ? resolveGameArtwork(game, { surface: 'hero' }) : null;
  const runnerUp = champion.runnerUp;

  const periodLabel = periodType === 'week' ? 'Weekly Champion' : periodType === 'month' ? 'Monthly Champion' : 'Yearly Champion';

  return (
    <div className="champion-share-card">
      {coverUrl && (
        <div className="champion-card-bg" style={{ backgroundImage: `url(${coverUrl})` }} />
      )}
      <div className="champion-card-overlay" />

      <div className="champion-card-inner">
        {/* Header */}
        <div className="champion-card-top">
          <div className="champion-badge">
            <Crown size={18} className="crown-icon" />
            <span>{periodLabel}</span>
          </div>
          <div className="champion-username-pill">
            <Gamepad2 size={16} />
            <span>{username}</span>
          </div>
        </div>

        {/* Champion Game Spotlight */}
        <div className="champion-spotlight">
          <div className="champion-trophy-ring">
            <Trophy size={36} className="trophy-gold" />
          </div>
          <h2 className="champion-game-title">{gameName}</h2>
          <div className="champion-stat-pills">
            <div className="champion-pill">
              <Clock size={15} />
              <span>{formatPlaytime(minutes)} played</span>
            </div>
            <div className="champion-pill">
              <Flame size={15} />
              <span>{sharePercent}% of playtime</span>
            </div>
          </div>
        </div>

        {/* Persona Roast Box */}
        <div className="champion-roast-box">
          <div className="roast-persona-header">
            <Sparkles size={14} />
            <span>{personaLabel} commentary</span>
          </div>
          <p className="roast-quote">"{roastLine}"</p>
        </div>

        {/* Runner-up if present */}
        {runnerUp && runnerUp.gameName && (
          <div className="champion-runnerup-bar">
            <span className="runnerup-label">Runner-up</span>
            <span className="runnerup-name">{runnerUp.gameName} ({formatPlaytime(runnerUp.minutes)})</span>
          </div>
        )}

        {/* Footer / Watermark */}
        <div className="champion-card-footer">
          <div className="watermark-pill">
            <ShareCardWatermark watermark={watermark} />
          </div>
          <span className="footer-tagline">100% Local · Zero Cloud Tracking</span>
        </div>
      </div>
    </div>
  );
}

export default ChampionShareCard;
