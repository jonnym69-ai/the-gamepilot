import { useState, useEffect, useCallback } from 'react';
import StorageService from '../services/StorageService';
import { normalizeLibraryData, getMostRecentlyPlayedGame } from '../services/LibraryDataService';
import { PlaytimeEnrichmentService } from '../services/PlaytimeEnrichmentService';
import { SteamGenreEnrichmentService } from '../services/SteamGenreEnrichmentService';
import { GameCurationService } from '../services/GameCurationService';
import IgdbArtworkService from '../services/IgdbArtworkService';
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

        let workingLibrary = normalizedLibrary;

        // Background Steam genre enrichment for games with generic Story-driven fallback
        try {
          const genreEnriched = await SteamGenreEnrichmentService.runBackgroundEnrichment(workingLibrary);
          if (genreEnriched && JSON.stringify(genreEnriched) !== JSON.stringify(workingLibrary)) {
            workingLibrary = normalizeLibraryData(genreEnriched);
            setLibrary(workingLibrary);
            StorageService.set('library', workingLibrary);
          }
        } catch (genreErr) {
          console.warn('Steam genre enrichment skipped:', genreErr.message);
        }

        // Opt-in IGDB cover lookup for games with no artwork source (mainly
        // non-Steam titles). Results cache on-device; misses retry weekly.
        try {
          const coverEnriched = await IgdbArtworkService.enrichLibraryCovers(workingLibrary);
          if (coverEnriched) {
            workingLibrary = coverEnriched;
            setLibrary(workingLibrary);
            StorageService.set('library', workingLibrary);
          }
        } catch (coverErr) {
          console.warn('IGDB cover enrichment skipped:', coverErr.message);
        }

        if (JSON.stringify(parsedLibrary) !== JSON.stringify(workingLibrary)) {
          StorageService.set('library', workingLibrary);
        }

        WishlistService.removeOwnedItems(workingLibrary);
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
