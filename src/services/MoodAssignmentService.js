/**
 * MoodAssignmentService - Assigns moods to games using the canonical genre→mood system.
 *
 * Uses the GENRE_MOOD_MAP from GenresMoods.js as the single source of truth.
 * Multi-genre games are scored across all their genres to find the dominant mood
 * rather than relying on fragile hardcoded game-name lookups.
 *
 * Signature: (gameName: string, genres: string[]) => string | null
 */
import { getMoodForGame, mapGameGenresToValid } from '../constants/GenresMoods';

export const assignMoodToGame = (gameName, genres = []) => {
  // Normalize genres through the canonical alias/keyword pipeline
  const validGenres = mapGameGenresToValid(genres);

  // Use the canonical multi-genre mood scorer (picks dominant mood across all genres)
  const mood = getMoodForGame(validGenres.length > 0 ? validGenres : genres);

  return mood || null;
};
