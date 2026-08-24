import React from 'react';
import { Gamepad2, BookOpen } from 'lucide-react';
import { resolveGameArtwork } from '../services/GameArtworkService';
import { formatPlaytime } from '../utils/formatPlaytime';
import { ShareCardWatermark } from './ShareCardWatermark';
import './StoryShareCard.css';

export const STORY_SHARE_CARD_SIZE_PX = 1080;

export function StoryShareCard({ stories = [], period = 'weekly', username = 'Pilot', totalPlaytime = 0, topGame = null, showCover = true, watermark = 'gamepilot' }) {
  const periodTitle = period === 'weekly' ? 'This Week' : period === 'monthly' ? 'This Month' : 'Story Recap';
  const coverUrl = showCover && topGame ? resolveGameArtwork(topGame, { surface: 'portrait' }) : null;

  return (
    <div className="story-share-card" style={{ width: STORY_SHARE_CARD_SIZE_PX, height: STORY_SHARE_CARD_SIZE_PX }}>
      {coverUrl && (
        <>
          <div
            className="story-share-card-cover"
            style={{ backgroundImage: `url(${coverUrl})` }}
            aria-hidden="true"
          />
          <div className="story-share-card-cover-overlay" aria-hidden="true" />
        </>
      )}
      <div className="story-share-card-glow" aria-hidden="true" />
      <Gamepad2 className="story-share-watermark" size={320} aria-hidden="true" />

      <div className="story-share-card-header">
        <span className="story-share-card-brand">GAMEPILOT</span>
        <span className="story-share-card-tag">{periodTitle}</span>
      </div>

      <div className="story-share-card-body">
        <div className="story-share-card-hero">
          <BookOpen size={48} className="story-share-card-icon" />
          <div>
            <span className="story-share-card-eyebrow">{username || 'Pilot'} · Story Recap</span>
            <h2 className="story-share-card-title">{periodTitle}</h2>
          </div>
        </div>

        <div className="story-share-card-stat-row">
          <div className="story-share-card-stat">
            <strong>{formatPlaytime(totalPlaytime)}</strong>
            <span>total playtime</span>
          </div>
          {topGame?.name && (
            <div className="story-share-card-stat">
              <strong>{topGame.name}</strong>
              <span>top game</span>
            </div>
          )}
        </div>

        <ul className="story-share-card-list">
          {stories.map((story, index) => (
            <li key={index} className="story-share-card-item">
              <span className="story-share-card-bullet" />
              <span>{story}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="story-share-card-footer">
        <ShareCardWatermark
          watermark={watermark}
          context="story"
          ctaClassName="story-share-card-cta"
          taglineClassName="story-share-card-tagline"
        />
      </div>
    </div>
  );
}

export default StoryShareCard;
