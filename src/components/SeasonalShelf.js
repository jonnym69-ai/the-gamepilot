import React, { useMemo } from 'react';
import { Play } from 'lucide-react';
import SeasonalRewardService from '../services/SeasonalRewardService';
import { getGameArtworkPlaceholder, resolveGameArtwork } from '../services/GameArtworkService';
import { isGameUnplayed } from '../services/RecommendationEngine';
import LazyImage from './LazyImage';

// Used when the active seasonal challenge has no genre requirement.
const SHELF_FALLBACKS = {
  spring: {
    name: 'Fresh Start Shelf',
    description: 'Adventure and indie picks from your library for a new season.',
    genres: ['Adventure', 'Indie', 'RPG'],
  },
  summer: {
    name: 'Summer Shelf',
    description: 'Action and racing picks from your library for longer days.',
    genres: ['Action', 'Shooter', 'Racing', 'Sports'],
  },
  autumn: {
    name: 'Autumn Shelf',
    description: 'Atmospheric picks from your library for darker evenings.',
    genres: ['Atmospheric', 'Story Rich', 'Adventure', 'RPG'],
  },
  winter: {
    name: 'Cozy Winter Shelf',
    description: 'Cozy picks from your library for the cold months.',
    genres: ['Cozy', 'Simulation', 'Puzzle', 'Indie'],
  },
};

const normalise = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const resolveTheme = () => {
  let challenge = null;
  let season = 'autumn';
  try {
    challenge = SeasonalRewardService.getCurrentSeasonChallenge();
    season = SeasonalRewardService.getCurrentSeason();
  } catch {
    challenge = null;
  }
  const genres = Array.isArray(challenge?.requirement?.genre)
    ? challenge.requirement.genre
    : challenge?.requirement?.genre
      ? [challenge.requirement.genre]
      : null;
  if (challenge && genres?.length) {
    return { name: `${challenge.name} Shelf`, description: challenge.description, genres };
  }
  return SHELF_FALLBACKS[season];
};

/**
 * Rotating, calendar-driven shelf of your own games on the Discover view —
 * e.g. horror picks in October. Prefers unplayed games, then longest idle.
 * Fully local; hidden when nothing in the library matches the theme.
 */
export default function SeasonalShelf({ library = [], onLaunchGame }) {
  const theme = useMemo(resolveTheme, []);
  const picks = useMemo(() => {
    if (!theme || !Array.isArray(library)) return [];
    const wanted = new Set((theme.genres || []).map(normalise));
    const lastPlayed = (game) => {
      const ts = new Date(game.lastPlayed || game.last_played || 0).getTime();
      return Number.isFinite(ts) ? ts : 0;
    };
    return library
      .filter((game) => {
        if (!game || game.installed === false) return false;
        const genres = Array.isArray(game.genres) ? game.genres : [];
        return genres.some((genre) => wanted.has(normalise(genre)));
      })
      .sort((a, b) => (isGameUnplayed(a) ? 0 : 1) - (isGameUnplayed(b) ? 0 : 1) || lastPlayed(a) - lastPlayed(b))
      .slice(0, 4);
  }, [library, theme]);

  if (!theme || picks.length === 0) return null;

  return (
    <section className="seasonal-shelf" aria-label={theme.name}>
      <header className="discover-radar-header">
        <div>
          <h2>{theme.name}</h2>
          <p>{theme.description}</p>
        </div>
      </header>
      <div className="discover-essential-cards">
        {picks.map((game) => {
          const artwork = resolveGameArtwork(game, { surface: 'portrait' });
          const placeholder = getGameArtworkPlaceholder({ game, surface: 'portrait' });
          return (
            <article key={game.id || game.appid || game.name} className="discover-quick-pick-card">
              <div
                className="discover-quick-pick-art"
                style={artwork ? { '--art-fill': `url("${artwork}")` } : undefined}
              >
                <LazyImage src={artwork} alt={`${game.name} artwork`} placeholder={placeholder} />
              </div>
              <div className="discover-quick-pick-details">
                <h4>{game.name}</h4>
                {isGameUnplayed(game) && <p className="discover-catalogue-note">Unplayed</p>}
                {onLaunchGame && (
                  <div className="discover-essential-actions">
                    <button
                      type="button"
                      className="discover-quick-pick-play"
                      aria-label={`Play ${game.name}`}
                      onClick={() => onLaunchGame(game)}
                    >
                      <Play size={14} aria-hidden="true" /> Play
                    </button>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
