import React from 'react';
import { CalendarDays, Clock, Gamepad2, Hourglass, Sparkles } from 'lucide-react';
import { resolveGameArtwork } from '../services/GameArtworkService';
import { formatPlaytime } from '../utils/formatPlaytime';
import { ShareCardWatermark } from './ShareCardWatermark';
import './YearInReviewShareCard.css';

/**
 * 1080x1080 square card optimised for social sharing. Shares the visual
 * language of EraShareCard — blurred artwork backdrop, badge + username pills,
 * centred spotlight, bordered games box, watermark footer.
 *
 * Rendered hidden off-screen and rasterised on demand by YearInReview.
 */
export const SHARE_CARD_SIZE_PX = 1080;

export function buildYearInReviewShareCaption(snapshot, year, username = 'Pilot') {
  if (!snapshot) return `${username || 'Pilot'} · Year in Review`;

  const playtime = formatPlaytime(snapshot?.summary?.playtimeMinutes);
  const sessions = snapshot?.summary?.sessions ?? 0;
  const activeDays = snapshot?.summary?.activeDays ?? 0;
  const topGames = (snapshot?.topGames || []).slice(0, 3);
  const topGameNames = topGames
    .map((g) => g.name)
    .filter(Boolean)
    .join(' · ');
  const persona = snapshot?.persona?.identityLabel || 'Player';
  const topMood = snapshot?.persona?.dominantMood || '—';

  const templates = [
    `My ${year} in games: ${playtime} across ${sessions} sessions. GamePilot says I played like a ${persona}.`,
    `${playtime}. ${sessions} sessions. ${activeDays} active days. GamePilot calls me a ${persona}. I'd argue it's just ${topMood} energy.`,
    `This year I logged ${playtime} of playtime. Top games: ${topGameNames || 'too many to name'}. My identity: ${persona}.`,
    `${year} recap 🎮 ${playtime} · ${sessions} sessions · ${activeDays} active days · played like a ${persona}`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

export function YearInReviewShareCard({ snapshot, year, username, watermark = 'gamepilot' }) {
  if (!snapshot) return null;

  const playtime = formatPlaytime(snapshot?.summary?.playtimeMinutes);
  const sessions = snapshot?.summary?.sessions ?? 0;
  const activeDays = snapshot?.summary?.activeDays ?? 0;
  const persona = snapshot?.persona?.identityLabel || 'Player';
  const topMood = snapshot?.persona?.dominantMood || null;
  const topGenre = snapshot?.persona?.dominantGenre || null;
  const topGames = (snapshot?.topGames || []).slice(0, 3);
  const eras = (snapshot?.eras?.stretches || []).map((era) => era.name).filter(Boolean);
  const topGame = topGames[0];
  const coverUrl = topGame ? topGame.coverUrl || resolveGameArtwork(topGame, { surface: 'hero' }) : null;

  const longestSession = snapshot?.deepStats?.longestSession;
  const busiestDay = snapshot?.deepStats?.busiestDay;

  const flavorParts = [];
  if (persona && persona !== 'Player') flavorParts.push(`played like a ${persona}`);
  if (topMood && topMood !== 'Unknown') flavorParts.push(`${topMood} mood`);
  if (topGenre && topGenre !== 'Unknown') flavorParts.push(`${topGenre} focus`);

  return (
    <div className="yir-share-card" style={{ width: SHARE_CARD_SIZE_PX, height: SHARE_CARD_SIZE_PX }}>
      {coverUrl && <div className="yir-card-bg" style={{ backgroundImage: `url(${coverUrl})` }} aria-hidden="true" />}
      <div className="yir-card-overlay" aria-hidden="true" />

      <div className="yir-card-inner">
        <div className="yir-card-top">
          <div className="yir-badge">
            <Hourglass size={18} />
            <span>Year in Review</span>
          </div>
          <div className="yir-username-pill">
            <Gamepad2 size={16} />
            <span>{username || 'Pilot'}</span>
          </div>
        </div>

        <div className="yir-spotlight">
          <h2 className="yir-title">{year} in Games</h2>
          {flavorParts.length > 0 && <p className="yir-flavor">{flavorParts.join(' · ')}</p>}
          <div className="yir-stat-pills">
            <div className="yir-pill">
              <Clock size={15} />
              <span>{playtime} played</span>
            </div>
            <div className="yir-pill">
              <Gamepad2 size={15} />
              <span>{sessions} sessions</span>
            </div>
            <div className="yir-pill">
              <CalendarDays size={15} />
              <span>{activeDays} active days</span>
            </div>
          </div>
        </div>

        {topGames.length > 0 && (
          <div className="yir-games-box">
            <div className="yir-games-header">
              <Sparkles size={14} />
              <span>Most played this year</span>
            </div>
            <div className="yir-games-list">
              {topGames.map((game, index) => (
                <div key={game.id || game.name || index} className="yir-game-row">
                  <span className="yir-game-rank">{index + 1}</span>
                  <span className="yir-game-name">{game.name}</span>
                  <span className="yir-game-minutes">{formatPlaytime(game.totalPlaytime)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="yir-moments">
          {eras.length > 0 && (
            <div className="yir-moment">
              <span className="yir-moment-label">Eras of the year</span>
              <strong>{eras.slice(0, 3).join(' → ')}</strong>
            </div>
          )}
          {longestSession && (
            <div className="yir-moment">
              <span className="yir-moment-label">Longest session</span>
              <strong>
                {longestSession.gameName} · {formatPlaytime(longestSession.playtimeMinutes)}
              </strong>
            </div>
          )}
          {busiestDay && (
            <div className="yir-moment">
              <span className="yir-moment-label">Busiest day</span>
              <strong>
                {busiestDay.dateLabel} · {formatPlaytime(busiestDay.playtimeMinutes)}
              </strong>
            </div>
          )}
        </div>

        <div className="yir-card-footer">
          <div className="watermark-pill">
            <ShareCardWatermark watermark={watermark} context="year" />
          </div>
          <span className="footer-tagline">100% Local · Zero Cloud Tracking</span>
        </div>
      </div>
    </div>
  );
}

export default YearInReviewShareCard;
