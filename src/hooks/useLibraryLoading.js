import { useState, useEffect, useCallback } from 'react';
import StorageService from '../services/StorageService';
import { normalizeLibraryData, getMostRecentlyPlayedGame } from '../services/LibraryDataService';
import { PlaytimeEnrichmentService } from '../services/PlaytimeEnrichmentService';
import { SteamGenreEnrichmentService } from '../services/SteamGenreEnrichmentService';
import { GameCurationService } from '../services/GameCurationService';
import WishlistService from '../services/WishlistService';

/**
 * Manages initial library loading from localStorage and the saveLibrary
 * persistence callback.
 *
 * Needs:
 *   - setLibrary: state setter for the library array
 *   - setLastPlayedGame: state setter for the most recently played game
 *
 * Returns:
 *   - hasLoadedLibrary: boolean, true after the initial load attempt
 *   - saveLibrary(libraryData): persist the library to localStorage
 */
export default function useLibraryLoading({ setLibrary, setLastPlayedGame }) {
  const [hasLoadedLibrary, setHasLoadedLibrary] = useState(false);

  const saveLibrary = useCallback((libraryData) => {
    try {
      const normalizedLibraryData = normalizeLibraryData(libraryData);
      StorageService.set('library', normalizedLibraryData);
      WishlistService.removeOwnedItems(normalizedLibraryData);
    } catch (err) {
      console.error(' Error saving library:', err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const parsedLibrary = StorageService.get('library', null);
        if (!Array.isArray(parsedLibrary) || parsedLibrary.length === 0) {
          return;
        }

        const enrichedLibrary = PlaytimeEnrichmentService.enrichLibraryWithPlaytime(parsedLibrary);
        const curatedLibrary = GameCurationService.enrichLibrary(enrichedLibrary);
        const normalizedLibrary = normalizeLibraryData(curatedLibrary);
        setLibrary(normalizedLibrary);

        const mostRecentlyPlayedGame = getMostRecentlyPlayedGame(normalizedLibrary);
        if (mostRecentlyPlayedGame) {
          setLastPlayedGame(mostRecentlyPlayedGame);
        }

        // Background Steam genre enrichment for games with generic Story-driven fallback
        try {
          const genreEnriched = await SteamGenreEnrichmentService.runBackgroundEnrichment(normalizedLibrary);
          if (genreEnriched && JSON.stringify(genreEnriched) !== JSON.stringify(normalizedLibrary)) {
            const reNormalized = normalizeLibraryData(genreEnriched);
            setLibrary(reNormalized);
            StorageService.set('library', reNormalized);
          }
        } catch (genreErr) {
          console.warn('Steam genre enrichment skipped:', genreErr.message);
        }

        if (JSON.stringify(parsedLibrary) !== JSON.stringify(normalizedLibrary)) {
          StorageService.set('library', normalizedLibrary);
        }

        WishlistService.removeOwnedItems(normalizedLibrary);
      } catch (error) {
        console.error('Error loading saved library:', error);
      } finally {
        setHasLoadedLibrary(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { hasLoadedLibrary, saveLibrary };
}
