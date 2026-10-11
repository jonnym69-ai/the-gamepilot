import { useState, useCallback } from 'react';
import { useToast } from '../components/Toast';
import { LibraryScanCoordinatorService } from '../services/LibraryScanCoordinatorService';
import { PlaytimeEnrichmentService } from '../services/PlaytimeEnrichmentService';
import { GameCurationService } from '../services/GameCurationService';
import IgdbArtworkService from '../services/IgdbArtworkService';
import StorageService from '../services/StorageService';
import { AchievementTracker } from '../AchievementSystem';
import { assignMoodToGame as importedAssignMoodToGame } from '../services/MoodAssignmentService';

/**
 * Manages the library scanning process — triggering scans, tracking the
 * loading state, and enriching the results.
 *
 * Needs:
 *   - library: the current library array
 *   - setLibrary: state setter
 *   - saveLibrary: from useLibraryLoading
 *   - showFirstStory: from useGamingStory
 *
 * Returns:
 *   - loading: boolean, true while a scan is in progress
 *   - scanLocalLibrary(): trigger a new scan
 */
export default function useLibraryScanner({ library, setLibrary, saveLibrary, showFirstStory }) {
  const [loading, setLoading] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const assignMoodToGame = useCallback((gameName, genres = []) => {
    return importedAssignMoodToGame(gameName, genres);
  }, []);

  const getFallbackLibrary = useCallback(() => {
    const stored = StorageService.get('library', []);
    return Array.isArray(stored) && stored.length > 0 ? stored : [];
  }, []);

  const scanLocalLibrary = useCallback(async () => {
    setLoading(true);

    try {
      const electronAvailable = typeof window.electronAPI !== 'undefined';
      if (!electronAvailable) {
        const fallbackLibrary = getFallbackLibrary();
        if (fallbackLibrary.length > 0) {
          setLibrary(fallbackLibrary);
          saveLibrary(fallbackLibrary);
          return;
        }
      }

      const {
        allGames = [],
        mergedLibrary = [],
        scanReport = null,
      } = await LibraryScanCoordinatorService.scanAndMergeLibrary({
        currentLibrary: library,
        assignMoodToGame,
        manual: true,
      });

      if (allGames.length === 0) {
        const fallbackLibrary = getFallbackLibrary();
        if (fallbackLibrary.length > 0) {
          const enrichedFallback = PlaytimeEnrichmentService.enrichLibraryWithPlaytime(fallbackLibrary);
          const curatedFallback = GameCurationService.enrichLibrary(enrichedFallback);
          setLibrary(curatedFallback);
          saveLibrary(curatedFallback);
          return;
        }
      }

      const enrichedMerged = PlaytimeEnrichmentService.enrichLibraryWithPlaytime(mergedLibrary);
      // Record newly discovered games for Recently Added tracking
      enrichedMerged.forEach((game) => GameCurationService.recordGameSeen(game.name));
      const curatedMerged = GameCurationService.enrichLibrary(enrichedMerged);
      setLibrary(curatedMerged);
      saveLibrary(curatedMerged);

      // Fill covers for non-Steam games in the background (opt-in IGDB lookup).
      // Only re-saves if covers actually changed; never blocks the scan result.
      if (IgdbArtworkService.isEnabled()) {
        IgdbArtworkService.enrichLibraryCovers(curatedMerged)
          .then((updated) => {
            if (updated) {
              setLibrary(updated);
              saveLibrary(updated);
            }
          })
          .catch(() => {});
      }

      showFirstStory(curatedMerged);

      window.dispatchEvent(
        new CustomEvent('gamepilot:scan-complete', {
          detail: { scanReport, gameCount: curatedMerged.length },
        })
      );

      const scanErrors = Number(scanReport?.summary?.errorPlatformCount || 0);
      if (curatedMerged.length === 0) {
        toastError('Scan completed, but no games were found. Open the scan report for launcher details.');
      } else if (scanErrors > 0) {
        toastError(
          `Found ${curatedMerged.length} games, but ${scanErrors} launcher scan${scanErrors === 1 ? '' : 's'} reported an error.`
        );
      } else {
        toastSuccess(`Library scan complete: ${curatedMerged.length} games found.`);
      }

      const welcome = AchievementTracker.grantLibraryWelcomeXP(curatedMerged.length);
      if (welcome?.granted) {
        toastSuccess(`Welcome aboard: +${welcome.xp} XP for building your library — the rest is earned by playing.`);
      }
    } catch (err) {
      console.error(' Error during scan:', err);
      console.error(' Detailed error stack:', err.stack);
      toastError(`Library scan failed: ${err?.message || 'Unknown scanner error'}`);
    } finally {
      setLoading(false);
    }
  }, [
    library,
    saveLibrary,
    assignMoodToGame,
    getFallbackLibrary,
    toastError,
    toastSuccess,
    setLibrary,
    showFirstStory,
  ]);

  return { loading, scanLocalLibrary };
}
