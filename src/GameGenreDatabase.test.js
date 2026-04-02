import { getGameGenres, gameBelongsToGenre } from './GameGenreDatabase';

// Unit tests for GameGenreDatabase functions
describe('GameGenreDatabase', () => {
  describe('getGameGenres', () => {
    test('should return genres for known games', () => {
      const genres = getGameGenres('The Witcher 3: Wild Hunt');
      expect(genres).toContain('RPG');
      expect(genres).toContain('Adventure');
    });

    test('should return empty array for unknown games', () => {
      const genres = getGameGenres('Unknown Game That Does Not Exist');
      expect(genres).toEqual([]);
    });

    test('should be case insensitive', () => {
      const genres1 = getGameGenres('THE WITCHER 3');
      const genres2 = getGameGenres('the witcher 3');
      expect(genres1).toEqual(genres2);
    });

    test('should cache results for performance', () => {
      // First call
      const genres1 = getGameGenres('Grand Theft Auto V');
      // Second call should use cache
      const genres2 = getGameGenres('Grand Theft Auto V');
      expect(genres1).toEqual(genres2);
      expect(genres1).toContain('Action');
    });

    test('should handle empty string', () => {
      const genres = getGameGenres('');
      expect(genres).toEqual([]);
    });

    test('should handle null/undefined', () => {
      const genres1 = getGameGenres(null);
      const genres2 = getGameGenres(undefined);
      expect(genres1).toEqual([]);
      expect(genres2).toEqual([]);
    });
  });

  describe('gameBelongsToGenre', () => {
    test('should correctly identify game genres', () => {
      expect(gameBelongsToGenre('The Witcher 3: Wild Hunt', 'RPG')).toBe(true);
      expect(gameBelongsToGenre('The Witcher 3: Wild Hunt', 'Action')).toBe(false);
      expect(gameBelongsToGenre('The Witcher 3: Wild Hunt', 'Unknown')).toBe(false);
    });

    test('should be case insensitive', () => {
      expect(gameBelongsToGenre('THE WITCHER 3', 'rpg')).toBe(true);
      expect(gameBelongsToGenre('the witcher 3', 'RPG')).toBe(true);
    });

    test('should handle partial matches', () => {
      expect(gameBelongsToGenre('Witcher 3', 'RPG')).toBe(true);
      expect(gameBelongsToGenre('Grand Theft Auto', 'Action')).toBe(true);
    });

    test('should return false for unknown games', () => {
      expect(gameBelongsToGenre('Unknown Game', 'Action')).toBe(false);
    });
  });
});
