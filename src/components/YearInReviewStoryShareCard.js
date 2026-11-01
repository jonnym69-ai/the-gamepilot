import React from 'react';
import { BookOpen, CalendarDays, Gamepad2 } from 'lucide-react';
import { ShareCardWatermark } from './ShareCardWatermark';
import { EraTimelineBar } from './EraTimelineBar';
import './YearInReviewStoryShareCard.css';

/**
 * 1080x1080 story card — shares EraShareCard's visual language
 * (badge pills, centred spotlight, bordered content box, watermark footer).
 * Rendered hidden off-screen and rasterised on demand by YearInReview.
 * Shows the first few data-driven story paragraphs.
 */
export const YIR_STORY_SHARE_CARD_SIZE_PX = 1080;

export function YearInReviewStoryShareCard({ story = {}, stretches = [], year, username = 'Pilot' }) {
  const paragraphs = Array.isArray(story?.paragraphs) ? story.paragraphs : [];
  const visibleParagraphs = paragraphs.slice(0, 4);
  const eraStretches = Array.isArray(stretches) ? stretches : [];

  return (
    <div
      className="yir-story-share-card"
      style={{ width: YIR_STORY_SHARE_CARD_SIZE_PX, height: YIR_STORY_SHARE_CARD_SIZE_PX }}
    >
      <div className="yir-story-card-overlay" aria-hidden="true" />

      <div className="yir-story-card-inner">
        <div className="yir-story-card-top">
          <div className="yir-story-badge">
            <BookOpen size={18} />
            <span>The Story of Your Year</span>
          </div>
          <div className="yir-story-username-pill">
            <Gamepad2 size={16} />
            <span>
              {username || 'Pilot'} · {year || 'This Year'}
            </span>
          </div>
        </div>

        <div className="yir-story-spotlight">
          <h2 className="yir-story-title">The Story of {year || 'Your'} Gaming Year</h2>
          <div className="yir-story-pills">
            <div className="yir-story-pill">
              <CalendarDays size={15} />
              <span>
                {paragraphs.length} chapter{paragraphs.length === 1 ? '' : 's'} from tracked sessions
              </span>
            </div>
          </div>
          {eraStretches.length > 0 && (
            <div className="yir-story-era-strip">
              <span className="yir-story-era-strip-label">The year in eras</span>
              <EraTimelineBar stretches={eraStretches} compact />
            </div>
          )}
        </div>

        <div className="yir-story-chapters-box">
          <div className="yir-story-chapters-header">
            <BookOpen size={14} />
            <span>How the year went</span>
          </div>
          <div className="yir-story-chapters-list">
            {visibleParagraphs.map((paragraph) => {
              const covers = Array.isArray(paragraph.covers) ? paragraph.covers : [];
              return (
                <div key={paragraph.id} className="yir-story-paragraph-row">
                  {covers.length > 0 && (
                    <div className="yir-share-covers" aria-hidden="true">
                      {covers.map((cover) => {
                        const layers = [cover.portrait, cover.portraitFallback, cover.placeholder]
                          .filter(Boolean)
                          .map((url) => `url("${String(url).replace(/"/g, '%22')}")`)
                          .join(', ');
                        return (
                          <span
                            key={cover.name}
                            className="yir-share-cover"
                            title={cover.name}
                            style={layers ? { backgroundImage: layers } : undefined}
                          />
                        );
                      })}
                    </div>
                  )}
                  <p className="yir-story-paragraph">{paragraph.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="yir-story-card-footer">
          <div className="watermark-pill">
            <ShareCardWatermark />
          </div>
          <span className="footer-tagline">100% Local · Zero Cloud Tracking</span>
        </div>
      </div>
    </div>
  );
}
