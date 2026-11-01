import { getGameSessionContext } from './GameSessionContext';

class PersonaPerformanceInsights {
  static estimateSessionMinutes(game = {}, history) {
    if (!game) return null;
    const { medianMinutes } = getGameSessionContext(game, history);
    if (Number.isFinite(medianMinutes) && medianMinutes > 0) return medianMinutes;
    const explicit = game.estimated_session_minutes;
    if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit > 0) {
      return Math.max(10, Math.round(explicit));
    }
    return null;
  }

  static extractGenres(game = {}, fallbackGenre = null) {
    const genreList = Array.isArray(game.genres) ? game.genres.slice() : [];
    if (fallbackGenre && !genreList.includes(fallbackGenre)) {
      genreList.push(fallbackGenre);
    }
    return genreList;
  }
}

export { PersonaPerformanceInsights };
