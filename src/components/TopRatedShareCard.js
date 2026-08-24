import React from 'react';
import { Star, Gamepad2 } from 'lucide-react';
import { resolveGameArtwork } from '../services/GameArtworkService';
import { formatPlaytime } from '../utils/formatPlaytime';
import { ShareCardWatermark } from './ShareCardWatermark';
import './TopRatedShareCard.css';

export const TOP_RATED_SHARE_CARD_SIZE_PX = 1080;

const resolvePlaytime = (game) => {
  const value = Number(game?.time_played ?? game?.playtime ?? game?.totalPlaytime ?? 0);
  return Number.isFinite(value) ? value : 0;
};

export function buildTopRatedShareData(library = [], username = 'Pilot', selectedGames = null) {
  const safeLibrary = Array.isArray(library) ? library : [];
  const allTopRated = safeLibrary
    .filter((game) => typeof game?.userRating === 'number' && game.userRating >= 10)
    .sort((left, right) => {
      const ratingDiff = (right.userRating || 0) - (left.userRating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return resolvePlaytime(right) - resolvePlaytime(left);
    });

  const topRated = Array.isArray(selectedGames) && selectedGames.length > 0
    ? selectedGames.slice(0, 6)
    : allTopRated.slice(0, 6);

  const totalPlaytime = topRated.reduce((sum, game) => sum + resolvePlaytime(game), 0);

  return {
    username,
    gameCount: topRated.length,
    totalPlaytime,
    formattedTotalPlaytime: formatPlaytime(totalPlaytime),
    topRated,
    allTopRated
  };
}

export function TopRatedShareCard({ library = [], selectedGames = null, username = 'Pilot', showCover = true, watermark = 'gamepilot' }) {
  const data = buildTopRatedShareData(library, username, selectedGames);
  const topGame = data.topRated?.[0];
  const coverUrl = showCover && topGame ? resolveGameArtwork(topGame, { surface: 'portrait' }) : null;
  const coverGrid = showCover && data.topRated.length > 0
    ? data.topRated.slice(0, 6).map((game) => resolveGameArtwork(game, { surface: 'portrait' })).filter(Boolean)
    : [];
  const showCoverGrid = coverGrid.length > 1;

  return (
    <div className="top-rated-share-card" style={{ width: TOP_RATED_SHARE_CARD_SIZE_PX, height: TOP_RATED_SHARE_CARD_SIZE_PX }}>
      {showCoverGrid ? (
        <>
          <div className="top-rated-share-card-cover-grid" aria-hidden="true">
            {coverGrid.map((url, index) => (
              <div
                key={index}
                className="top-rated-share-card-cover-cell"
                style={{ backgroundImage: `url(${url})` }}
              />
            ))}
          </div>
          <div className="top-rated-share-card-cover-overlay" aria-hidden="true" />
        </>
      ) : coverUrl ? (
        <>
          <div
            className="top-rated-share-card-cover"
            style={{ backgroundImage: `url(${coverUrl})` }}
            aria-hidden="true"
          />
          <div className="top-rated-share-card-cover-overlay" aria-hidden="true" />
        </>
      ) : null}
      <div className="top-rated-share-card-glow" aria-hidden="true" />
      <Gamepad2 className="top-rated-watermark" size={320} aria-hidden="true" />

      <div className="top-rated-share-card-header">
        <span className="top-rated-share-card-brand">GAMEPILOT</span>
        <span className="top-rated-share-card-tag">Perfect 10 Picks</span>
      </div>

      <div className="top-rated-share-card-body">
        <span className="top-rated-share-card-eyebrow">
          {data.username || 'Pilot'} · Hall of Fame
        </span>

        <div className="top-rated-share-card-headline">
          <div className="top-rated-share-card-stat">
            <strong>{data.gameCount}</strong>
            <span>perfect 10/10 games</span>
          </div>
        </div>

        <div className="top-rated-share-card-strip">
          <div>
            <strong>{data.formattedTotalPlaytime}</strong>
            <span>total playtime</span>
          </div>
        </div>

        {data.topRated.length > 0 && (
          <div className="top-rated-share-card-list">
            <span className="top-rated-share-card-section-label">Top rated picks</span>
            {data.topRated.map((game, index) => (
              <div key={game.id || game.name || index} className="top-rated-share-card-row">
                <span className="top-rated-share-card-rank">#{index + 1}</span>
                <div className="top-rated-share-card-info">
                  <strong>{game.name}</strong>
                  <span>{formatPlaytime(resolvePlaytime(game))} · {game.genres?.slice(0, 2).join(' · ') || 'No genre'}</span>
                </div>
                <div className="top-rated-share-card-stars">
                  {[...Array(10)].map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      fill={i < Math.round(game.userRating || 0) ? 'currentColor' : 'none'}
                      stroke={i < Math.round(game.userRating || 0) ? 'currentColor' : 'currentColor'}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="top-rated-share-card-footer">
        <ShareCardWatermark
          watermark={watermark}
          context="toprated"
          ctaClassName="top-rated-share-card-cta"
          taglineClassName="top-rated-share-card-tagline"
        />
      </div>
    </div>
  );
}

export default TopRatedShareCard;
