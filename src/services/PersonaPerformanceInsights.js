class PersonaPerformanceInsights {
  static estimateSessionMinutes(game = {}) {
    if (!game) return null;
    if (typeof game.estimated_session_minutes === 'number') {
      return Math.max(10, Math.round(game.estimated_session_minutes));
    }
    if (game.time_played && game.launch_count) {
      const avg = Math.max(10, Math.round(game.time_played / Math.max(game.launch_count, 1)));
      return avg;
    }
    if (game.time_played) {
      return Math.max(10, Math.round(game.time_played));
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
