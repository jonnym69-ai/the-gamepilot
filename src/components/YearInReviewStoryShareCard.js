import React from 'react';
import { BookOpen, Calendar, Clock, Gamepad2 } from 'lucide-react';
import { ShareCardWatermark } from './ShareCardWatermark';
import './YearInReviewStoryShareCard.css';

export const YIR_STORY_SHARE_CARD_SIZE_PX = 1080;

export function YearInReviewStoryShareCard({ seasonalStory = {}, year, username = 'Pilot' }) {
  const story = seasonalStory || {};
  const chapters = story.chapters || [];
  const hasData = chapters.filter((c) => c.hasData);

  return (
    <div className="yir-story-share-card" style={{ width: YIR_STORY_SHARE_CARD_SIZE_PX, height: YIR_STORY_SHARE_CARD_SIZE_PX }}>
      <div className="yir-story-share-card-glow" aria-hidden="true" />
      <Gamepad2 className="yir-story-share-watermark" size={320} aria-hidden="true" />

      <div className="yir-story-share-card-header">
        <span className="yir-story-share-card-brand">GAMEPILOT</span>
        <span className="yir-story-share-card-tag">Year In Review</span>
      </div>

      <div className="yir-story-share-card-body">
        <div className="yir-story-share-card-hero">
          <BookOpen size={48} className="yir-story-share-card-icon" />
          <div>
            <span className="yir-story-share-card-eyebrow">{username || 'Pilot'} · {year || 'This Year'}</span>
            <h2 className="yir-story-share-card-title">The Story of Your Year</h2>
          </div>
        </div>

        {story.arc && (
          <p className="yir-story-share-card-arc">{story.arc}</p>
        )}

        <div className="yir-story-share-card-chapters">
          {chapters.filter((c) => c.hasData).slice(0, 4).map((chapter) => (
            <div key={chapter.season} className="yir-story-share-card-chapter">
              <div className="yir-story-share-card-chapter-season">
                <Calendar size={14} />
                <span>{chapter.season}</span>
              </div>
              <strong>{chapter.headline}</strong>
              {chapter.stats && (
                <div className="yir-story-share-card-chapter-stats">
                  <span><Clock size={12} /> {chapter.stats.playtimeHours}h</span>
                  <span>{chapter.stats.sessions} sessions</span>
                  {chapter.stats.topGame && (
                    <span className="yir-story-share-card-top-game">{chapter.stats.topGame.name}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {hasData.length > 0 && (
          <div className="yir-story-share-card-total">
            <span>{hasData.length} active seasons</span>
          </div>
        )}
      </div>

      <ShareCardWatermark />
    </div>
  );
}
