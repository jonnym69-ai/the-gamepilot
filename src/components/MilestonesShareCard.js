import React from 'react';
import { CalendarDays, Gamepad2, Medal, Sparkles, Trophy } from 'lucide-react';
import { ShareCardWatermark } from './ShareCardWatermark';
import './MilestonesShareCard.css';

/**
 * 1080x1080 milestones card — shares YearInReviewShareCard's visual language
 * (blurred artwork backdrop, badge + username pills, centred spotlight,
 * bordered games box, watermark footer). Rendered hidden off-screen and
 * rasterised on demand by YearInReview.
 */
export const MILESTONES_SHARE_CARD_SIZE_PX = 1080;

const STATUS_LABELS = { beaten: 'Beaten', completed: 'Completed', '100%': '100%' };

export function buildMilestonesShareCaption(milestones, year, username = 'Pilot') {
  if (!milestones?.hasAny) return `${username || 'Pilot'} · ${year} milestones`;

  const finished = Array.isArray(milestones.finished) ? milestones.finished : [];
  const achievements = milestones.achievements || null;
  const lines = [`My ${year} gaming milestones`, ''];

  if (finished.length > 0) {
    const names = finished
      .slice(0, 4)
      .map((game) => game.name)
      .filter(Boolean)
      .join(' · ');
    lines.push(`${finished.length} game${finished.length === 1 ? '' : 's'} finished${names ? `: ${names}` : ''}`);
  }
  if (achievements?.unlockedThisYear > 0) {
    lines.push(
      `${achievements.unlockedThisYear} achievement${achievements.unlockedThisYear === 1 ? '' : 's'} unlocked across ${achievements.gamesWithUnlocks} game${achievements.gamesWithUnlocks === 1 ? '' : 's'}`
    );
  }
  if (achievements?.rarest) {
    lines.push(
      `Rarest unlock: "${achievements.rarest.name}" — ${achievements.rarest.percent}% of players (${achievements.rarest.gameName})`
    );
  }
  const comeback = milestones.comebacks?.[0];
  if (comeback) {
    lines.push(`Came back to ${comeback.name} after ${comeback.gapDays} days away`);
  }
  if (milestones.firstsCount > 0) {
    lines.push(
      `${milestones.firstsCount} new game${milestones.firstsCount === 1 ? '' : 's'} played for the first time`
    );
  }

  lines.push('', 'Powered by GamePilot');
  return lines.join('\n');
}

export function MilestonesShareCard({ milestones, year, username, watermark = 'gamepilot' }) {
  if (!milestones?.hasAny) return null;

  const finished = Array.isArray(milestones.finished) ? milestones.finished : [];
  const achievements = milestones.achievements || null;
  const visibleFinished = finished.slice(0, 4);
  const coverUrl = finished.find((game) => game.coverUrl)?.coverUrl || null;

  return (
    <div
      className="milestones-share-card"
      style={{ width: MILESTONES_SHARE_CARD_SIZE_PX, height: MILESTONES_SHARE_CARD_SIZE_PX }}
    >
      {coverUrl && (
        <div className="milestones-share-bg" style={{ backgroundImage: `url(${coverUrl})` }} aria-hidden="true" />
      )}
      <div className="milestones-share-overlay" aria-hidden="true" />

      <div className="milestones-share-inner">
        <div className="milestones-share-top">
          <div className="milestones-share-badge">
            <Trophy size={18} />
            <span>Milestones</span>
          </div>
          <div className="milestones-share-username-pill">
            <Gamepad2 size={16} />
            <span>{username || 'Pilot'}</span>
          </div>
        </div>

        <div className="milestones-share-spotlight">
          <span className="milestones-share-year">{year} · Milestones</span>
          <h2 className="milestones-share-number">{finished.length}</h2>
          <span className="milestones-share-number-label">game{finished.length === 1 ? '' : 's'} finished</span>
        </div>

        {visibleFinished.length > 0 && (
          <div className="milestones-share-box">
            <div className="milestones-share-box-header">
              <Trophy size={14} />
              <span>Rolled credits</span>
            </div>
            <div className="milestones-share-list">
              {visibleFinished.map((game) => (
                <div key={game.name} className="milestones-share-row">
                  <span className="milestones-share-game">{game.name}</span>
                  <span className="milestones-share-status">{STATUS_LABELS[game.status] || game.status}</span>
                </div>
              ))}
              {finished.length > visibleFinished.length && (
                <div className="milestones-share-more">+{finished.length - visibleFinished.length} more</div>
              )}
            </div>
          </div>
        )}

        <div className="milestones-share-moments">
          {achievements && achievements.unlockedThisYear > 0 && (
            <div className="milestones-share-moment">
              <Medal size={16} />
              <span>
                {achievements.unlockedThisYear} achievement{achievements.unlockedThisYear === 1 ? '' : 's'} unlocked
                across {achievements.gamesWithUnlocks} game{achievements.gamesWithUnlocks === 1 ? '' : 's'}
              </span>
            </div>
          )}
          {achievements?.rarest && (
            <div className="milestones-share-moment">
              <Sparkles size={16} />
              <span>
                Rarest: &ldquo;{achievements.rarest.name}&rdquo; — {achievements.rarest.percent}% of players
              </span>
            </div>
          )}
          {milestones.firstsCount > 0 && (
            <div className="milestones-share-moment">
              <CalendarDays size={16} />
              <span>
                {milestones.firstsCount} new game{milestones.firstsCount === 1 ? '' : 's'} picked up this year
              </span>
            </div>
          )}
        </div>

        <div className="milestones-share-footer">
          <div className="watermark-pill">
            <ShareCardWatermark watermark={watermark} context="year" />
          </div>
          <span className="footer-tagline">100% Local · Zero Cloud Tracking</span>
        </div>
      </div>
    </div>
  );
}

export default MilestonesShareCard;
