import React from 'react';
import { Gamepad2 } from 'lucide-react';
import { resolveGameArtwork } from '../services/GameArtworkService';
import { formatPlaytime } from '../utils/formatPlaytime';
import { ShareCardWatermark } from './ShareCardWatermark';
import './YearInReviewShareCard.css';

/**
 * 1080x1080 square card optimised for social sharing. Renders the year's
 * biggest story — playtime, top games, standout moments, and persona — plus a
 * strong GamePilot call-to-action so every share is a free ad.
 *
 * Rendered hidden off-screen and rasterised on demand by YearInReview.
 */
export const SHARE_CARD_SIZE_PX = 1080;


const TopGameRow = ({ index, game }) => {
  if (!game) return null;
  return (
    <div className="yir-share-top-game">
      <span className="yir-share-top-game-rank">#{index + 1}</span>
      <div className="yir-share-top-game-info">
        <strong>{game.name}</strong>
        <span>{formatPlaytime(game.totalPlaytime)} · {game.sessions} session{game.sessions !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
};

export function YearInReviewShareCard({ snapshot, year, username, showCover = true, watermark = 'gamepilot' }) {
  if (!snapshot) return null;

  const playtime = formatPlaytime(snapshot?.summary?.playtimeMinutes);
  const sessions = snapshot?.summary?.sessions ?? 0;
  const activeDays = snapshot?.summary?.activeDays ?? 0;
  const avgSession = formatPlaytime(snapshot?.summary?.avgSessionMinutes);
  const persona = snapshot?.persona?.identityLabel || 'Player';
  const topMood = snapshot?.persona?.dominantMood || '—';
  const topGenre = snapshot?.persona?.dominantGenre || '—';
  const topGames = (snapshot?.topGames || []).slice(0, 3);
  const topGame = topGames[0];
  const coverUrl = showCover && topGame ? resolveGameArtwork(topGame, { surface: 'hero' }) : null;
  const storyArc = snapshot?.seasonalStory?.arc;

  const longestSession = snapshot?.deepStats?.longestSession;
  const busiestDay = snapshot?.deepStats?.busiestDay;

  const longestSessionLabel = longestSession
    ? `${longestSession.gameName} · ${formatPlaytime(longestSession.playtimeMinutes)}`
    : '—';

  const busiestDayLabel = busiestDay
    ? `${busiestDay.dateLabel} · ${formatPlaytime(busiestDay.playtimeMinutes)}`
    : '—';

  return (
    <div
      className="yir-share-card"
      style={{ width: SHARE_CARD_SIZE_PX, height: SHARE_CARD_SIZE_PX }}
    >
      {coverUrl && (
        <>
          <div
            className="yir-share-card-cover"
            style={{ backgroundImage: `url(${coverUrl})` }}
            aria-hidden="true"
          />
          <div className="yir-share-card-cover-overlay" aria-hidden="true" />
        </>
      )}
      <div className="yir-share-card-glow" aria-hidden="true" />
      <Gamepad2 className="yir-share-watermark" size={320} aria-hidden="true" />

      <div className="yir-share-card-header">
        <span className="yir-share-card-brand">GAMEPILOT</span>
        <span className="yir-share-card-year">{year}</span>
      </div>

      <div className="yir-share-card-body">
        <span className="yir-share-card-eyebrow">{username || 'Pilot'} · Year in Review</span>

        <div className="yir-share-card-headline">
          <div className="yir-share-card-stat">
            <strong>{playtime}</strong>
            <span>played this year</span>
          </div>
        </div>

        {storyArc && (
          <div className="yir-share-card-story">
            <span className="yir-share-card-section-label">The Story of Your Year</span>
            <p>{storyArc}</p>
          </div>
        )}

        <div className="yir-share-card-persona">
          <span>You played like a</span>
          <strong>{persona}</strong>
        </div>

        <div className="yir-share-card-strip">
          <div>
            <strong>{sessions}</strong>
            <span>sessions</span>
          </div>
          <div>
            <strong>{activeDays}</strong>
            <span>active days</span>
          </div>
          <div>
            <strong>{avgSession}</strong>
            <span>avg session</span>
          </div>
        </div>

        {topGames.length > 0 && (
          <div className="yir-share-card-top-games">
            <span className="yir-share-card-section-label">Top games</span>
            <div className="yir-share-card-top-games-list">
              {topGames.map((game, index) => (
                <TopGameRow key={game.id || game.name || index} index={index} game={game} />
              ))}
            </div>
          </div>
        )}

        <div className="yir-share-card-moments">
          <div>
            <span className="yir-share-card-section-label">Longest session</span>
            <strong>{longestSessionLabel}</strong>
          </div>
          <div>
            <span className="yir-share-card-section-label">Busiest day</span>
            <strong>{busiestDayLabel}</strong>
          </div>
        </div>

        <div className="yir-share-card-tags">
          <div>
            <span className="yir-share-card-section-label">Top mood</span>
            <strong>{topMood}</strong>
          </div>
          <div>
            <span className="yir-share-card-section-label">Top genre</span>
            <strong>{topGenre}</strong>
          </div>
        </div>
      </div>

      <div className="yir-share-card-footer">
        <ShareCardWatermark
          watermark={watermark}
          context="year"
          ctaClassName="yir-share-card-cta"
          taglineClassName="yir-share-card-tagline"
        />
      </div>
    </div>
  );
}

export default YearInReviewShareCard;
