import React from 'react';
import { Hourglass, CalendarDays, Clock, Gamepad2, Sparkles } from 'lucide-react';
import { formatPlaytime } from '../utils/formatPlaytime';
import { resolveGameArtwork } from '../services/GameArtworkService';
import { ShareCardWatermark } from './ShareCardWatermark';
import './EraShareCard.css';

/**
 * Offscreen render target for the "share your era" PNG. Rendered at fixed
 * 1080x1080 and captured with html2canvas by the caller — mirrors
 * ChampionShareCard's contract.
 */
export function EraShareCard({ era = null, game = null, username = 'Player', watermark = 'gamepilot' }) {
  if (!era) return null;

  const eraName = era.name || 'The Wandering Era';
  const flavor = era.flavor || 'a bit of everything';
  const dayCount = era.dayCount || 1;
  const totalMinutes = era.snapshot?.totalMinutes || 0;
  const topGames = (era.snapshot?.topGames || []).slice(0, 3);
  const coverUrl = game ? resolveGameArtwork(game, { surface: 'hero' }) : null;

  return (
    <div className="era-share-card">
      {coverUrl && <div className="era-card-bg" style={{ backgroundImage: `url(${coverUrl})` }} />}
      <div className="era-card-overlay" />

      <div className="era-card-inner">
        <div className="era-card-top">
          <div className="era-badge">
            <Hourglass size={18} />
            <span>Current Gaming Era</span>
          </div>
          <div className="era-username-pill">
            <Gamepad2 size={16} />
            <span>{username}</span>
          </div>
        </div>

        <div className="era-spotlight">
          <h2 className="era-title">{eraName}</h2>
          <p className="era-flavor">{flavor}</p>
          <div className="era-stat-pills">
            <div className="era-pill">
              <CalendarDays size={15} />
              <span>Day {dayCount}</span>
            </div>
            {totalMinutes > 0 && (
              <div className="era-pill">
                <Clock size={15} />
                <span>{formatPlaytime(totalMinutes)} this era</span>
              </div>
            )}
          </div>
        </div>

        {topGames.length > 0 && (
          <div className="era-games-box">
            <div className="era-games-header">
              <Sparkles size={14} />
              <span>Defining this era</span>
            </div>
            <div className="era-games-list">
              {topGames.map((g, index) => (
                <div key={g.name || index} className="era-game-row">
                  <span className="era-game-rank">{index + 1}</span>
                  <span className="era-game-name">{g.name}</span>
                  <span className="era-game-minutes">{formatPlaytime(g.minutes)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="era-card-footer">
          <div className="watermark-pill">
            <ShareCardWatermark watermark={watermark} />
          </div>
          <span className="footer-tagline">100% Local · Zero Cloud Tracking</span>
        </div>
      </div>
    </div>
  );
}

export default EraShareCard;
